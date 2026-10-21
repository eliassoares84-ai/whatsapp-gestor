import React from 'react';

type CopilotHook = {
  currentStep: { text?: string; name?: string; order?: number } | null | undefined;
  currentStepNumber: number;
  totalStepsNumber: number;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  goToNext?: () => Promise<void>;
  goToPrev?: () => Promise<void>;
  goToNth: (step: number) => Promise<void>;
  stop: () => Promise<void>;
  start: (fromStep?: string) => Promise<void>;
  copilotEvents: {
    on: (eventName: string, callback: () => void) => void;
    off: (eventName: string, callback: () => void) => void;
  };
};

const noOpAsync = async (): Promise<void> => {};
const noOpEvent = (): void => {};

const fallbackHook: CopilotHook = {
  currentStep: null,
  currentStepNumber: 0,
  totalStepsNumber: 0,
  isFirstStep: true,
  isLastStep: true,
  goToNext: noOpAsync,
  goToPrev: noOpAsync,
  goToNth: noOpAsync,
  stop: noOpAsync,
  start: noOpAsync,
  copilotEvents: {
    on: noOpEvent,
    off: noOpEvent,
  },
};

type CopilotProviderProps = {
  children: React.ReactNode;
} & Record<string, unknown>;

type CopilotStepProps = {
  children: React.ReactNode;
} & Record<string, unknown>;

const FallbackProvider: React.FC<CopilotProviderProps> = ({ children }) => <>{children}</>;
const FallbackStep: React.FC<CopilotStepProps> = ({ children }) => <>{children}</>;
const fallbackWalkthroughable = <T extends React.ComponentType<any>>(Component: T): T => Component;

let SafeCopilotProvider: React.ComponentType<any> = FallbackProvider;
let safeUseCopilot = (): CopilotHook => fallbackHook;
let SafeCopilotStep: React.ComponentType<any> = FallbackStep;
let safeWalkthroughable = fallbackWalkthroughable;

try {
  const copilotModule = require('react-native-copilot') as {
    CopilotProvider?: React.ComponentType<any>;
    useCopilot?: () => CopilotHook;
    CopilotStep?: React.ComponentType<any>;
    walkthroughable?: <T extends React.ComponentType<any>>(component: T) => T;
  };

  if (copilotModule.CopilotProvider) {
    SafeCopilotProvider = copilotModule.CopilotProvider;
  }

  if (copilotModule.useCopilot) {
    safeUseCopilot = copilotModule.useCopilot;
  }

  if (copilotModule.CopilotStep) {
    SafeCopilotStep = copilotModule.CopilotStep;
  }

  if (copilotModule.walkthroughable) {
    safeWalkthroughable = copilotModule.walkthroughable;
  }
} catch {
  // Keep fallback implementations when copilot is unavailable.
}

export const CopilotProvider = SafeCopilotProvider as React.FC<CopilotProviderProps>;
export const useCopilot = safeUseCopilot;
export const CopilotStep = SafeCopilotStep as React.FC<CopilotStepProps>;
export const walkthroughable = safeWalkthroughable;
