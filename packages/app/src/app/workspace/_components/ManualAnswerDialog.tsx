"use client";

import { useTranslation } from "react-i18next";
import { ManualResponseModal } from "@/components/organisms/ManualResponseModal";
import { useManualResponseModal } from "~/hooks/useManualResponseModal";

export interface ManualAnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the answer's label ("Name (Provider)") and trimmed text. */
  onAdd: (label: string, response: string) => void;
}

/**
 * Adds an answer by hand (pasted from another tool, FR-023), from the
 * composer's options menu. Before a run it joins the next run; during or
 * after a run it joins that run and the consensus runs again.
 */
export function ManualAnswerDialog({
  open,
  onOpenChange,
  onAdd,
}: ManualAnswerDialogProps) {
  const { t } = useTranslation();
  // The workspace owns whether the dialog is open; the hook owns the fields.
  const modal = useManualResponseModal(
    t("organisms.manualResponseModal.title"),
    onAdd,
  );
  const close = () => {
    modal.handleOpenChange(false);
    onOpenChange(false);
  };

  return (
    <ManualResponseModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      value={modal.response}
      onChange={modal.setResponse}
      modelName={modal.modelName}
      onModelNameChange={modal.setModelName}
      modelProvider={modal.modelProvider}
      onModelProviderChange={modal.setModelProvider}
      onSubmit={(data) => {
        modal.handleSubmit(data);
        onOpenChange(false);
      }}
      onCancel={close}
    />
  );
}
