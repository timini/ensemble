"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/atoms/Button";
import { ManualResponseModal } from "@/components/organisms/ManualResponseModal";
import { useManualResponseModal } from "~/hooks/useManualResponseModal";

export interface AddManualResponseProps {
  /** Called with the answer's label and text when the dialog is submitted. */
  onAdd: (label: string, response: string) => void;
  className?: string;
}

/**
 * "Add manual response" button with its dialog, for the prompt and review
 * pages (FR-023). The ensemble sidebar has its own button.
 */
export function AddManualResponse({
  onAdd,
  className,
}: AddManualResponseProps) {
  const { t } = useTranslation();
  const modal = useManualResponseModal(
    t("organisms.manualResponseModal.title"),
    onAdd,
  );

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={modal.openModal}
        data-testid="add-manual-response"
      >
        {t("organisms.ensembleSidebar.addManualResponse")}
      </Button>
      <ManualResponseModal
        open={modal.isOpen}
        onOpenChange={modal.handleOpenChange}
        value={modal.response}
        onChange={modal.setResponse}
        modelName={modal.modelName}
        onModelNameChange={modal.setModelName}
        modelProvider={modal.modelProvider}
        onModelProviderChange={modal.setModelProvider}
        onSubmit={modal.handleSubmit}
        onCancel={modal.handleCancel}
      />
    </>
  );
}
