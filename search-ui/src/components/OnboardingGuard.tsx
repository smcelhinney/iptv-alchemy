import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding } from "../contexts/OnboardingContext";

const VALID_STEPS = ["setup", "download-and-filters", "build-library"];

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { hasOnboarded, onboardingStep, isLoading } = useOnboarding();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg
          className="w-8 h-8 animate-spin text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  const isOnOnboardingPage = location.pathname.startsWith("/onboarding");

  if (!hasOnboarded && !isOnOnboardingPage) {
    const step = onboardingStep && VALID_STEPS.includes(onboardingStep)
      ? onboardingStep
      : "setup";
    return <Navigate to={`/onboarding/${step}`} replace />;
  }

  if (hasOnboarded && isOnOnboardingPage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
