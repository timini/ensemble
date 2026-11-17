"use client";

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/atoms/Sheet";
import { InlineAlert } from "@/components/atoms/InlineAlert";
import { Button } from "@/components/atoms/Button";
import { ApiKeyConfiguration } from "@/components/organisms/ApiKeyConfiguration";
import { EndpointConfiguration } from "@/components/organisms/EndpointConfiguration";
import {
  OllamaDetectedNotice,
  type OllamaDetectedNoticeProps,
} from "@/components/molecules/OllamaDetectedNotice";
import { EmbeddingsProviderSelector } from "@/components/molecules/EmbeddingsProviderSelector";
import { AppearanceSettings } from "@/components/molecules/AppearanceSettings";
import { useStore } from "~/store";
import { LOCAL_MODELS_GUIDE_URL, LOCAL_RUN_COMMAND } from "~/lib/localModels";
import type { useApiKeySettings } from "../hooks/useApiKeySettings";
import type { useEndpointConfiguration } from "../hooks/useEndpointConfiguration";
import { useEmbeddingsProviderSetting } from "../hooks/useEmbeddingsProviderSetting";
import { useEmbeddingProviderStatuses } from "../hooks/useEndpointConfiguration";

export interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keys: ReturnType<typeof useApiKeySettings>;
  endpoints: ReturnType<typeof useEndpointConfiguration>;
  /** The Ollama offer on first run, or null. */
  ollamaOffer: OllamaDetectedNoticeProps | null;
  /** Clears everything stored in this browser. */
  onClearData: () => void;
}

function Section({
  title,
  children,
  testId,
}: {
  title?: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section
      data-testid={testId}
      className="space-y-4 border-t border-border py-6 first:border-t-0 first:pt-0"
    >
      {title && <h3 className="text-label font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

/**
 * Settings sheet of the workspace, replacing the old /config page: API keys,
 * local and hosted OpenAI-compatible endpoints (with the Ollama offer), the
 * embeddings provider for the agreement score, theme and language, and
 * clearing the data kept in this browser. /config opens it.
 */
export function SettingsSheet(props: SettingsSheetProps) {
  const { keys, endpoints } = props;
  const { t } = useTranslation("common");
  const key = "pages.workspace.settings";
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const embeddings = useEmbeddingsProviderSetting(
    useEmbeddingProviderStatuses(keys.hydratedStatuses, true),
  );
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <Sheet
      open={props.open}
      onOpenChange={(open) => {
        if (!open) setConfirmClear(false);
        props.onOpenChange(open);
      }}
      title={t(`${key}.title`)}
      testId="settings-sheet"
      className="md:w-[520px]"
    >
      {!keys.webCryptoSupported && (
        <InlineAlert variant="error" className="mb-6">
          <p className="font-semibold">{t(`${key}.webCryptoTitle`)}</p>
          <p className="mt-1">{t(`${key}.webCryptoBody`)}</p>
        </InlineAlert>
      )}
      <Section testId="settings-keys">
        <p
          data-testid="settings-security-note"
          className="text-caption text-muted-foreground"
        >
          {t(`${key}.securityNote`)}
        </p>
        <ApiKeyConfiguration
          items={keys.items}
          configuredCountOverride={keys.validKeyCount}
          onKeyChange={keys.onKeyChange}
          onToggleShow={keys.onToggleShow}
          heading={t(`${key}.keys`)}
          disabled={!keys.webCryptoSupported}
        />
      </Section>
      <Section testId="settings-endpoints">
        {props.ollamaOffer && <OllamaDetectedNotice {...props.ollamaOffer} />}
        <EndpointConfiguration
          endpoints={endpoints.items}
          presets={endpoints.presets}
          onAdd={endpoints.onAdd}
          onChange={endpoints.onChange}
          onRemove={endpoints.onRemove}
          guideUrl={LOCAL_MODELS_GUIDE_URL}
          localRunCommand={LOCAL_RUN_COMMAND}
        />
      </Section>
      <Section testId="settings-embeddings">
        <EmbeddingsProviderSelector
          value={embeddings.value}
          available={embeddings.available}
          activeProvider={embeddings.activeProvider}
          onChange={embeddings.onChange}
        />
      </Section>
      <Section title={t(`${key}.appearance`)} testId="settings-appearance">
        <AppearanceSettings
          theme={theme}
          onThemeChange={setTheme}
          language={language === "fr" ? "fr" : "en"}
          onLanguageChange={setLanguage}
        />
      </Section>
      <Section title={t(`${key}.data`)} testId="settings-data">
        {confirmClear ? (
          <div className="space-y-3" data-testid="clear-data-confirm">
            <p className="text-label text-muted-foreground">
              {t(`${key}.clearConfirm`)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={props.onClearData}
                data-testid="clear-data-confirm-button"
              >
                {t(`${key}.clearConfirmYes`)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(false)}
              >
                {t(`${key}.clearCancel`)}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            data-testid="clear-data-button"
            className="rounded text-label font-medium text-destructive focus-ring hover:underline"
          >
            {t(`${key}.clearData`)}
          </button>
        )}
      </Section>
    </Sheet>
  );
}
