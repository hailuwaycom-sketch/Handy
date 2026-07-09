import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface MicrophoneNoiseCancellationProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const MicrophoneNoiseCancellation: React.FC<MicrophoneNoiseCancellationProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const noiseSuppressionEnabled =
      getSetting("noise_suppression_enabled") ?? false;

    return (
      <ToggleSwitch
        checked={noiseSuppressionEnabled}
        onChange={(enabled) =>
          updateSetting("noise_suppression_enabled", enabled)
        }
        isUpdating={isUpdating("noise_suppression_enabled")}
        label={t("settings.sound.noiseCancellation.label")}
        description={t("settings.sound.noiseCancellation.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  });
