import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';

interface ManualResponseFormData {
  response: string;
  modelName: string;
  modelProvider: string;
}

interface ManualResponseModalHook {
  isOpen: boolean;
  response: string;
  modelName: string;
  modelProvider: string;
  openModal: () => void;
  handleOpenChange: (open: boolean) => void;
  setResponse: (value: string) => void;
  setModelName: (value: string) => void;
  setModelProvider: (value: string) => void;
  handleSubmit: (data: ManualResponseFormData) => void;
  handleCancel: () => void;
}

export function useManualResponseModal(
  t: TFunction<'common'>,
  addManualResponse: (label: string, response: string) => void,
): ManualResponseModalHook {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelProvider, setModelProvider] = useState('');

  const reset = useCallback(() => {
    setResponse('');
    setModelName('');
    setModelProvider('');
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  const handleSubmit = useCallback(
    (data: ManualResponseFormData) => {
      const labelBase =
        data.modelName.trim() ||
        t('organisms.manualResponseModal.title', {
          defaultValue: 'Manual Response',
        });
      const providerSuffix = data.modelProvider.trim()
        ? ` (${data.modelProvider.trim()})`
        : '';

      addManualResponse(`${labelBase}${providerSuffix}`, data.response.trim());
      closeModal();
    },
    [addManualResponse, closeModal, t],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        reset();
      }
    },
    [reset],
  );

  return {
    isOpen,
    response,
    modelName,
    modelProvider,
    openModal: () => setIsOpen(true),
    handleOpenChange,
    setResponse,
    setModelName,
    setModelProvider,
    handleSubmit,
    handleCancel: closeModal,
  };
}
