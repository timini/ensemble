import { useRouter } from "next/navigation";
import { useStore } from "~/store";

/**
 * Navigation buttons of /review: back to the prompt (keeps the run), a new
 * comparison (clears the run and its manual answers, keeps the ensemble and
 * the prompt draft) and start over from /config (clears the same).
 */
export function useReviewNavigation() {
  const router = useRouter();
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const resetStreamingState = useStore((state) => state.resetStreamingState);
  const clearManualResponses = useStore((state) => state.clearManualResponses);

  const handleBack = () => {
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  // Manual answers were written for the old prompt; keeping them would send
  // them to the summarizer and the agreement analysis of the next run.
  const handleNewComparison = () => {
    resetStreamingState();
    clearManualResponses();
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleStartOver = () => {
    setCurrentStep("config");
    resetStreamingState();
    clearManualResponses();
    router.push("/config");
  };

  return { handleBack, handleNewComparison, handleStartOver };
}
