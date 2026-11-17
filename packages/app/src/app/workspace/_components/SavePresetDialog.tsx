"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/atoms/Dialog";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";

export interface SavePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves the current models, method and summarizer under `name`. */
  onSave: (name: string) => void;
}

/**
 * Names the current ensemble and saves it as a preset, from the composer's
 * options menu. A name already in use replaces that preset.
 */
export function SavePresetDialog({
  open,
  onOpenChange,
  onSave,
}: SavePresetDialogProps) {
  const { t } = useTranslation("common");
  const key = "pages.workspace.savePreset";
  const [name, setName] = useState("");
  const close = (next: boolean) => {
    if (!next) setName("");
    onOpenChange(next);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md" data-testid="save-preset-dialog">
        <form onSubmit={save} className="space-y-4">
          <DialogTitle>{t(`${key}.title`)}</DialogTitle>
          <DialogDescription>{t(`${key}.description`)}</DialogDescription>
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">{t(`${key}.name`)}</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(`${key}.placeholder`)}
              data-testid="preset-name-input"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
            >
              {t(`${key}.cancel`)}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              data-testid="preset-save-button"
            >
              {t(`${key}.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
