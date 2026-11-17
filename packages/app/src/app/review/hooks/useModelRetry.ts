import { useStore } from "~/store";

/**
 * Retry handler for one model's card. It clears the consensus and any
 * consensus error so consensus runs again once every answer is back, then
 * streams that model again. Calls already made stay in the run cost.
 */
export function useModelRetry(
  retryModel: (modelId: string) => Promise<void>,
  resetConsensusError: () => void,
) {
  const clearConsensus = useStore((state) => state.clearConsensus);

  return (modelId: string) => {
    clearConsensus();
    resetConsensusError();
    void retryModel(modelId);
  };
}
