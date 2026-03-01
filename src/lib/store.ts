import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AnalysisResult } from "./gemini";

export type PromptConfig = {
  targetModel: string;
  goalType: string;
  outputFormat: string;
  depthMode: string;
};

export type HistoryEntry = {
  id: string;
  timestamp: number;
  rawPrompt: string;
  config: PromptConfig;
  analysis: AnalysisResult | null;
  optimizedPrompt: string | null;
  heuristicScore?: number;
  optimizedScore?: number;
};

interface AppState {
  hasKey: boolean;
  setHasKey: (val: boolean) => void;

  config: PromptConfig;
  setConfig: (config: Partial<PromptConfig>) => void;

  history: HistoryEntry[];
  addHistoryEntry: (entry: HistoryEntry) => void;
  removeHistoryEntry: (id: string) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasKey: false, // Inferred on app load from localStorage
      setHasKey: (val) => set({ hasKey: val }),

      config: {
        targetModel: "ChatGPT",
        goalType: "Technical",
        outputFormat: "Markdown",
        depthMode: "Basic",
      },
      setConfig: (newConfig) =>
        set((state) => ({ config: { ...state.config, ...newConfig } })),

      history: [],
      addHistoryEntry: (entry) =>
        set((state) => {
          // Keep only the last NEXT_PUBLIC_HISTORY_LIMIT entries, default to 20
          const limit = Number(
            process.env.NEXT_PUBLIC_HISTORY_LIMIT || "20"
          );
          const newHistory = [entry, ...state.history].slice(0, limit);
          return { history: newHistory };
        }),
      removeHistoryEntry: (id) =>
        set((state) => ({
          history: state.history.filter((e) => e.id !== id),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "pf_app_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        history: state.history,
        // hasKey is explicitly NOT persisted here because the actual key is in `pf_gemini_key`.
        // We will re-check `pf_gemini_key` on mount to set `hasKey`.
      }),
    }
  )
);
