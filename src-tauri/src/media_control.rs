//! Pause/resume system media playback around a dictation.
//!
//! Uses the Windows Global System Media Transport Controls (GSMTC) so we only
//! pause sessions that are actually *playing* right now, remember exactly which
//! ones we touched, and later resume only those — never un-pausing media the
//! user had paused themselves. A no-op on non-Windows platforms for now.

#[cfg(windows)]
mod imp {
    use log::{debug, warn};
    use once_cell::sync::Lazy;
    use std::sync::Mutex;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
    };
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

    /// `SourceAppUserModelId`s of the sessions we paused, so resume touches only
    /// those. Guarded by a mutex because pause and resume run on separate
    /// short-lived worker threads.
    static PAUSED: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));

    /// Initialize COM on the current (freshly spawned) worker thread. WinRT
    /// requires an initialized apartment; a plain `std::thread` has none. Benign
    /// if already initialized — the thread is one-shot so we don't uninitialize.
    fn ensure_com() {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
    }

    fn session_manager() -> windows::core::Result<SessionManager> {
        SessionManager::RequestAsync()?.get()
    }

    pub fn pause_playing_media() {
        ensure_com();
        match pause_inner() {
            Ok(n) => debug!("pause_media: paused {} playing session(s)", n),
            Err(e) => warn!("pause_media: failed to pause media: {:?}", e),
        }
    }

    fn pause_inner() -> windows::core::Result<usize> {
        let manager = session_manager()?;
        let sessions = manager.GetSessions()?;

        let mut paused = PAUSED.lock().unwrap();
        // Any leftover ids from a prior run are stale — resume already drained
        // them, but clear defensively so the list never accumulates.
        paused.clear();

        let mut count = 0usize;
        for i in 0..sessions.Size()? {
            let session = sessions.GetAt(i)?;
            let status = session.GetPlaybackInfo()?.PlaybackStatus()?;
            if status != PlaybackStatus::Playing {
                continue;
            }
            // TryPauseAsync resolves to whether the session accepted the request.
            if session.TryPauseAsync()?.get().unwrap_or(false) {
                let id = session.SourceAppUserModelId()?.to_string();
                debug!("pause_media: paused '{}'", id);
                paused.push(id);
                count += 1;
            }
        }
        Ok(count)
    }

    pub fn resume_paused_media() {
        // Drain first so a WinRT failure here doesn't strand ids and leave media
        // stuck paused across the *next* recording too.
        let ids: Vec<String> = {
            let mut paused = PAUSED.lock().unwrap();
            std::mem::take(&mut *paused)
        };
        if ids.is_empty() {
            return;
        }
        ensure_com();
        match resume_inner(&ids) {
            Ok(n) => debug!("pause_media: resumed {} session(s)", n),
            Err(e) => warn!("pause_media: failed to resume media: {:?}", e),
        }
    }

    fn resume_inner(ids: &[String]) -> windows::core::Result<usize> {
        let manager = session_manager()?;
        let sessions = manager.GetSessions()?;

        let mut count = 0usize;
        for i in 0..sessions.Size()? {
            let session = sessions.GetAt(i)?;
            let id = session.SourceAppUserModelId()?.to_string();
            if ids.iter().any(|paused_id| paused_id == &id)
                && session.TryPlayAsync()?.get().unwrap_or(false)
            {
                debug!("pause_media: resumed '{}'", id);
                count += 1;
            }
        }
        Ok(count)
    }
}

#[cfg(not(windows))]
mod imp {
    // Media session control isn't wired up on macOS/Linux yet; keep the call
    // sites platform-agnostic with no-ops.
    pub fn pause_playing_media() {}
    pub fn resume_paused_media() {}
}

pub use imp::{pause_playing_media, resume_paused_media};
