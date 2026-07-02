import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SetupStep from "../components/onboarding/SetupStep";
import DownloadParseStep, { type Phase } from "../components/onboarding/DownloadParseStep";
import FiltersStep from "../components/onboarding/FiltersStep";
import FinishStep from "../components/onboarding/FinishStep";
import { useOnboarding } from "../contexts/OnboardingContext";

const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "download-and-filters", label: "Download & Filters" },
  { key: "build-library", label: "Build Library" },
];

const STEP_KEYS = STEPS.map((s) => s.key);

export default function OnboardingPage() {
  const { step: urlStep } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const { saveStep } = useOnboarding();
  const lastSavedStep = useRef<string | null>(null);
  const [downloadPhase, setDownloadPhase] = useState<Phase>("idle");

  const handlePhaseChange = useCallback((phase: Phase) => {
    setDownloadPhase(phase);
  }, []);

  const currentStep = STEP_KEYS.indexOf(urlStep ?? "");

  // Redirect invalid/missing step to /onboarding/setup
  useEffect(() => {
    if (currentStep === -1) {
      navigate("/onboarding/setup", { replace: true });
    }
  }, [currentStep, navigate]);

  // Persist step to server whenever it advances
  useEffect(() => {
    if (currentStep >= 0 && STEP_KEYS[currentStep] !== lastSavedStep.current) {
      lastSavedStep.current = STEP_KEYS[currentStep];
      saveStep(STEP_KEYS[currentStep]);
    }
  }, [currentStep, saveStep]);

  if (currentStep === -1) {
    return null;
  }

  const goNext = () => {
    const next = Math.min(currentStep + 1, STEPS.length - 1);
    navigate(`/onboarding/${STEP_KEYS[next]}`);
  };
  const goBack = () => {
    const prev = Math.max(currentStep - 1, 0);
    navigate(`/onboarding/${STEP_KEYS[prev]}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-2xl my-auto">
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-8">Welcome to IPTV Processor</h1>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < currentStep
                    ? "bg-green-600 text-white"
                    : i === currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400"
                }`}
              >
                {i < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < currentStep ? "bg-green-600" : "bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step label */}
        <p className="text-center text-sm text-gray-400 mb-6">
          Step {currentStep + 1}: {STEPS[currentStep].label}
        </p>

        {/* Step content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          {currentStep === 0 && <SetupStep onNext={goNext} />}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-gray-700 pb-6">
                <DownloadParseStep onNext={goNext} onBack={goBack} onPhaseChange={handlePhaseChange} />
              </div>
              <div>
                <FiltersStep
                  onNext={goNext}
                  onBack={goBack}
                  showButtons={true}
                  disabled={downloadPhase === "downloading" || downloadPhase === "parsing"}
                />
              </div>
            </div>
          )}
          {currentStep === 2 && <FinishStep onBack={goBack} onNext={goNext} />}
        </div>
      </div>
    </div>
  );
}
