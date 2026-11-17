import { useCallback } from "react";
import { useStore } from "~/store";

/**
 * "New question" in the workspace: clears the run on screen and its manual
 * answers, and empties the composer. The ensemble, method and summarizer
 * stay. Manual answers were written for the old prompt; keeping them would
 * send them to the next run's consensus and agreement score.
 */
export function useNewQuestion() {
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const clearManualResponses = useStore((state) => state.clearManualResponses);
  const setPrompt = useStore((state) => state.setPrompt);

  return useCallback(() => {
    resetStreamingState();
    clearManualResponses();
    setPrompt("");
  }, [resetStreamingState, clearManualResponses, setPrompt]);
}
