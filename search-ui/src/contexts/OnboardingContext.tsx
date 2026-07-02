import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchOnboardingStatus, saveOnboardingStep } from "../lib/api";
import type { OnboardingTask } from "../types/config";

interface OnboardingContextValue {
  hasOnboarded: boolean;
  onboardingStep: string;
  currentTask: OnboardingTask | null;
  isLoading: boolean;
  refetch: () => void;
  saveStep: (step: string, currentTask?: OnboardingTask | null) => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  hasOnboarded: false,
  onboardingStep: "",
  currentTask: null,
  isLoading: true,
  refetch: () => {},
  saveStep: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchOnboardingStatus,
    staleTime: 0,
  });

  const stepMutation = useMutation({
    mutationFn: ({ step, currentTask }: { step?: string; currentTask?: OnboardingTask | null }) =>
      saveOnboardingStep(step, currentTask),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
    },
  });

  const saveStep = useCallback(
    (step: string, currentTask?: OnboardingTask | null) => {
      stepMutation.mutate({ step, currentTask });
    },
    [stepMutation],
  );

  return (
    <OnboardingContext.Provider
      value={{
        hasOnboarded: data?.has_onboarded ?? false,
        onboardingStep: data?.onboarding_step ?? "",
        currentTask: data?.current_task ?? null,
        isLoading,
        refetch: () => {
          qc.invalidateQueries({ queryKey: ["onboarding-status"] });
        },
        saveStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
