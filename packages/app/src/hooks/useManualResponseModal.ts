import { useCallback, useState } from 'react';

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

/**
 * State of the manual response dialog. On submit it adds the answer as
 * "Name (Provider)", using `defaultLabel` when no name is given.
 */
export function useManualResponseModal(
  defaultLabel: string,
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
      const labelBase = data.modelName.trim() || defaultLabel;
      const providerSuffix = data.modelProvider.trim()
        ? ` (${data.modelProvider.trim()})`
        : '';

      addManualResponse(`${labelBase}${providerSuffix}`, data.response.trim());
      closeModal();
    },
    [addManualResponse, closeModal, defaultLabel],
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
