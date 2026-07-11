import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "../../hooks/useSettings";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { SettingContainer } from "../ui/SettingContainer";
import type { TextReplacementRule } from "@/bindings";

interface TextReplacementSettingsProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const TextReplacementSettings: React.FC<TextReplacementSettingsProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const [find, setFind] = useState("");
    const [replace, setReplace] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);

    const rules = getSetting("text_replacement_rules") || [];
    const updating = isUpdating("text_replacement_rules");

    const handleAddRule = () => {
      const trimmedFind = find.trim();
      if (!trimmedFind) return;

      if (useRegex) {
        try {
          new RegExp(trimmedFind);
        } catch {
          toast.error(t("settings.advanced.textReplacement.invalidRegex"));
          return;
        }
      }

      const newRule: TextReplacementRule = {
        id: `rule_${Date.now()}`,
        find: trimmedFind,
        replace,
        use_regex: useRegex,
        case_sensitive: caseSensitive,
      };
      updateSetting("text_replacement_rules", [...rules, newRule]);
      setFind("");
      setReplace("");
      setUseRegex(false);
      setCaseSensitive(false);
    };

    const handleRemoveRule = (id: string) => {
      updateSetting(
        "text_replacement_rules",
        rules.filter((r) => r.id !== id),
      );
    };

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.textReplacement.title")}
          description={t("settings.advanced.textReplacement.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                className="max-w-28"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder={t(
                  "settings.advanced.textReplacement.findPlaceholder",
                )}
                variant="compact"
                disabled={updating}
              />
              <span className="text-mid-gray text-sm">→</span>
              <Input
                type="text"
                className="max-w-28"
                value={replace}
                onChange={(e) => setReplace(e.target.value)}
                placeholder={t(
                  "settings.advanced.textReplacement.replacePlaceholder",
                )}
                variant="compact"
                disabled={updating}
              />
              <Button
                onClick={handleAddRule}
                disabled={!find.trim() || updating}
                variant="primary"
                size="md"
              >
                {t("settings.advanced.textReplacement.add")}
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-mid-gray">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                />
                {t("settings.advanced.textReplacement.useRegex")}
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                {t("settings.advanced.textReplacement.caseSensitive")}
              </label>
            </div>
          </div>
        </SettingContainer>
        {rules.length > 0 && (
          <div
            className={`px-4 p-2 ${grouped ? "" : "rounded-lg border border-mid-gray/20"} flex flex-col gap-1`}
          >
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-mono truncate">
                  {r.find} <span className="text-mid-gray">→</span> {r.replace}
                  {r.use_regex && (
                    <span className="ml-1.5 text-xs text-logo-primary">
                      regex
                    </span>
                  )}
                  {r.case_sensitive && (
                    <span className="ml-1.5 text-xs text-mid-gray">Aa</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(r.id)}
                  disabled={updating}
                  className="text-mid-gray hover:text-red-400 cursor-pointer flex-shrink-0"
                  aria-label={t("settings.advanced.textReplacement.remove", {
                    find: r.find,
                  })}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  });
