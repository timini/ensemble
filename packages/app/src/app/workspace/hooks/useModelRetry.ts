import { useStore } from "~/store";

/**
 * Retry handler for one model's card. It clears the consensus, any consensus
 * error and the result of a consensus still running (which would leave out
 * the retried model), so consensus runs again once every answer is back. Then
 * it streams that model again. Calls already made stay in the run cost.
 */
export function useModelRetry(
  retryModel: (modelId: string) => Promise<void>,
  restartConsensus: () => void,
) {
  const clearConsensus = useStore((state) => state.clearConsensus);

  return (modelId: string) => {
    clearConsensus();
    restartConsensus();
    void retryModel(modelId);
  };
}
