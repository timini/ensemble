import { useStore } from "~/store";

/**
 * Handler for adding a manual answer on /review (FR-023). The answer is
 * stored, then the consensus is cleared and any consensus still running is
 * dropped, so consensus runs again over every answer. The agreement analysis
 * picks the new answer up when its embedding is ready.
 */
export function useAddManualAnswer(restartConsensus: () => void) {
  const addManualResponse = useStore((state) => state.addManualResponse);
  const clearConsensus = useStore((state) => state.clearConsensus);

  return (label: string, response: string) => {
    addManualResponse(label, response);
    clearConsensus();
    restartConsensus();
  };
}

/**
 * Handler for removing a manual answer. Its embedding goes with it and
 * agreement is scored again over the answers left; the consensus is cleared
 * and any consensus still running is dropped, so consensus runs again
 * without the removed answer.
 */
export function useRemoveManualAnswer(restartConsensus: () => void) {
  const removeManualResponse = useStore((state) => state.removeManualResponse);
  const clearConsensus = useStore((state) => state.clearConsensus);

  return (id: string) => {
    removeManualResponse(id);
    clearConsensus();
    restartConsensus();
  };
}
