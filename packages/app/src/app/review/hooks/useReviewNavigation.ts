import { useRouter } from "next/navigation";
import { useStore } from "~/store";

/**
 * Navigation buttons of /review: back to the prompt, a new comparison
 * (clears the run, keeps the ensemble) and start over from /config.
 */
export function useReviewNavigation() {
  const router = useRouter();
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const resetStreamingState = useStore((state) => state.resetStreamingState);

  const handleBack = () => {
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleNewComparison = () => {
    resetStreamingState();
    setCurrentStep("prompt");
    router.push("/prompt");
  };

  const handleStartOver = () => {
    setCurrentStep("config");
    resetStreamingState();
    router.push("/config");
  };

  return { handleBack, handleNewComparison, handleStartOver };
}
