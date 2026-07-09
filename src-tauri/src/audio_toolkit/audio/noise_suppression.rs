use nnnoiseless::DenoiseState;
use rubato::{FftFixedIn, Resampler};

use crate::audio_toolkit::constants;

// RNNoise is hard-wired to 48kHz in fixed 10ms (480-sample) blocks; the rest
// of the pipeline runs at 16kHz in 30ms (480-sample) frames — a clean 3:1
// ratio, so one pipeline frame always covers exactly 3 RNNoise blocks with no
// remainder. We bridge the rate gap with the same FFT resampler already used
// for device-rate -> 16kHz conversion, just run in both directions.
const RNNOISE_SAMPLE_RATE: usize = 48_000;
const RNNOISE_FRAME_SIZE: usize = DenoiseState::FRAME_SIZE;
const INPUT_FRAME_SAMPLES: usize = (constants::WHISPER_SAMPLE_RATE as usize * 30) / 1000;

// RNNoise's C API expects samples pre-scaled to the int16 range, not [-1, 1].
const I16_SCALE: f32 = i16::MAX as f32;

/// Denoises 16kHz pipeline frames with RNNoise.
///
/// Stateful: RNNoise carries recurrent state across calls, so one instance
/// must live for the whole recording session and see every frame in order —
/// do not construct a fresh one per frame.
pub struct NoiseSuppressor {
    upsampler: FftFixedIn<f32>,
    downsampler: FftFixedIn<f32>,
    denoise: Box<DenoiseState<'static>>,
}

impl NoiseSuppressor {
    /// Builds a suppressor for the pipeline's fixed 16kHz / 30ms frame size.
    pub fn new() -> Result<Self, String> {
        let upsampler = FftFixedIn::<f32>::new(
            constants::WHISPER_SAMPLE_RATE as usize,
            RNNOISE_SAMPLE_RATE,
            INPUT_FRAME_SAMPLES,
            1,
            1,
        )
        .map_err(|e| format!("failed to create RNNoise upsampler: {e}"))?;

        let downsampler = FftFixedIn::<f32>::new(
            RNNOISE_SAMPLE_RATE,
            constants::WHISPER_SAMPLE_RATE as usize,
            RNNOISE_FRAME_SIZE * 3,
            1,
            1,
        )
        .map_err(|e| format!("failed to create RNNoise downsampler: {e}"))?;

        Ok(Self {
            upsampler,
            downsampler,
            denoise: DenoiseState::new(),
        })
    }

    /// Denoises one 16kHz pipeline frame (30ms / 480 samples).
    ///
    /// Always returns a frame the same length as `samples` so callers can
    /// feed the result straight into VAD without a length check. Frames of
    /// an unexpected size, or any resampler failure, fall back to returning
    /// the input unchanged rather than panicking or silently truncating.
    pub fn process_frame(&mut self, samples: &[f32]) -> Vec<f32> {
        if samples.len() != INPUT_FRAME_SAMPLES {
            return samples.to_vec();
        }

        let upsampled = match self.upsampler.process(&[samples], None) {
            Ok(mut channels) => channels.remove(0),
            Err(err) => {
                log::warn!("RNNoise upsample failed, passing frame through: {err}");
                return samples.to_vec();
            }
        };

        let mut denoised_48k = Vec::with_capacity(upsampled.len());
        let mut in_block = [0.0f32; RNNOISE_FRAME_SIZE];
        let mut out_block = [0.0f32; RNNOISE_FRAME_SIZE];

        for block in upsampled.chunks(RNNOISE_FRAME_SIZE) {
            // The upsampler is configured for an exact 3x block count, but
            // guard the tail anyway rather than trust that invariant blindly.
            for (dst, src) in in_block.iter_mut().zip(block.iter()) {
                *dst = (*src * I16_SCALE).clamp(i16::MIN as f32, i16::MAX as f32);
            }
            for dst in in_block.iter_mut().skip(block.len()) {
                *dst = 0.0;
            }

            self.denoise.process_frame(&mut out_block, &in_block);

            denoised_48k.extend(out_block.iter().map(|s| (*s / I16_SCALE).clamp(-1.0, 1.0)));
        }

        let mut output = match self.downsampler.process(&[&denoised_48k], None) {
            Ok(mut channels) => channels.remove(0),
            Err(err) => {
                log::warn!("RNNoise downsample failed, passing frame through: {err}");
                return samples.to_vec();
            }
        };

        output.resize(samples.len(), 0.0);
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rms(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }
        (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
    }

    #[test]
    fn silence_in_silence_out() {
        let mut suppressor = NoiseSuppressor::new().expect("suppressor should construct");
        let silence = vec![0.0f32; INPUT_FRAME_SAMPLES];

        let output = suppressor.process_frame(&silence);

        assert_eq!(output.len(), silence.len());
        assert!(
            rms(&output) < 0.01,
            "expected near-silence out, got rms={}",
            rms(&output)
        );
    }

    #[test]
    fn output_length_always_matches_input_length() {
        let mut suppressor = NoiseSuppressor::new().expect("suppressor should construct");
        let tone: Vec<f32> = (0..INPUT_FRAME_SAMPLES)
            .map(|i| 0.2 * (2.0 * std::f32::consts::PI * 220.0 * i as f32 / 16000.0).sin())
            .collect();

        // Several frames in a row, since RNNoise's internal state can only
        // shift behavior over time, not the output length.
        for _ in 0..5 {
            let output = suppressor.process_frame(&tone);
            assert_eq!(output.len(), tone.len());
        }
    }

    #[test]
    fn does_not_silently_erase_a_clean_tone() {
        let mut suppressor = NoiseSuppressor::new().expect("suppressor should construct");
        let tone: Vec<f32> = (0..INPUT_FRAME_SAMPLES)
            .map(|i| 0.3 * (2.0 * std::f32::consts::PI * 220.0 * i as f32 / 16000.0).sin())
            .collect();
        let input_rms = rms(&tone);

        // RNNoise needs a few frames to settle past its initial silence
        // assumption; check the signal survives once it has.
        let mut output = tone.clone();
        for _ in 0..10 {
            output = suppressor.process_frame(&tone);
        }

        assert!(
            rms(&output) > input_rms * 0.2,
            "expected a clean tone to mostly survive denoising, input_rms={} output_rms={}",
            input_rms,
            rms(&output)
        );
    }

    #[test]
    fn non_standard_frame_size_falls_back_without_panicking() {
        let mut suppressor = NoiseSuppressor::new().expect("suppressor should construct");

        let too_short = vec![0.1f32; INPUT_FRAME_SAMPLES / 2];
        let output = suppressor.process_frame(&too_short);
        assert_eq!(output, too_short);

        let too_long = vec![0.1f32; INPUT_FRAME_SAMPLES * 2];
        let output = suppressor.process_frame(&too_long);
        assert_eq!(output, too_long);

        let empty: Vec<f32> = vec![];
        let output = suppressor.process_frame(&empty);
        assert!(output.is_empty());
    }
}
