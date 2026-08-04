"use client";
import { create } from "zustand";
import { AgentStep, ChatMode, Message, RagSource, VisionPresetId } from "../types/types";
import { User } from "next-auth";

export type MemoryHint = {
  turnCount: number;
  recentTurnCount: number;
  didSummarize: boolean;
  hasSummary: boolean;
} | null;

interface GeminiState {
  msgLoader: boolean;
  setMsgLoader: (msgLoader: boolean) => void;
  setPrevChat: (newChat: Message) => void;
  prevChat: Message;
  topLoader: boolean;
  setTopLoader: (topLoader: boolean) => void;
  currChat: Message;
  setCurrChat: (name: string | null, value: string | null) => void;
  userData: User;
  setUserData: (userData: User) => void;
  optimisticResponse: string | null;
  setOptimisticResponse: (optimisticResponse: string | null) => void;
  setToast: (toast: string | null) => void;
  setErrorToast: (toast: string | null) => void;
  toastIsError: boolean;
  devToast: string | null;
  inputImgName: string | null;
  setInputImgName: (inputImgName: string | null) => void;
  optimisticPrompt: string | null;
  setOptimisticPrompt: (optimisticPrompt: string | null) => void;
  customPrompt: { prompt: string | null; placeholder: string | null };
  setCustomPrompt: (value: {
    prompt: string | null;
    placeholder: string | null;
  }) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  memoryHint: MemoryHint;
  setMemoryHint: (hint: MemoryHint) => void;
  useKnowledge: boolean;
  setUseKnowledge: (useKnowledge: boolean) => void;
  knowledgeDocCount: number;
  setKnowledgeDocCount: (count: number) => void;
  optimisticRagSources: RagSource[] | null;
  setOptimisticRagSources: (sources: RagSource[] | null) => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  optimisticAgentSteps: AgentStep[] | null;
  setOptimisticAgentSteps: (steps: AgentStep[] | null) => void;
  liveAgentSteps: AgentStep[];
  setLiveAgentSteps: (steps: AgentStep[]) => void;
  visionPreset: VisionPresetId | null;
  setVisionPreset: (preset: VisionPresetId | null) => void;
  inputImageId: string | null;
  setInputImageId: (imageId: string | null) => void;
}

const geminiZustand = create<GeminiState>()((set) => ({
  msgLoader: false,
  devToast: null,
  toastIsError: false,
  prevChat: { userPrompt: "", llmResponse: "" },
  topLoader: false,
  setToast: (value: string | null) =>
    set({ devToast: value, toastIsError: false }),
  setErrorToast: (value: string | null) =>
    set({ devToast: value, toastIsError: true }),
  userData: {},
  optimisticResponse: null,
  optimisticPrompt: null,
  inputImgName: null,
  customPrompt: { prompt: null, placeholder: null },
  setCustomPrompt: (value) => set({ customPrompt: value }),
  selectedModel: "gemini-1.5-flash",
  setSelectedModel: (selectedModel: string) => set({ selectedModel }),
  memoryHint: null,
  setMemoryHint: (memoryHint) => set({ memoryHint }),
  useKnowledge: false,
  setUseKnowledge: (useKnowledge) => set({ useKnowledge }),
  knowledgeDocCount: 0,
  setKnowledgeDocCount: (knowledgeDocCount) => set({ knowledgeDocCount }),
  optimisticRagSources: null,
  setOptimisticRagSources: (optimisticRagSources) => set({ optimisticRagSources }),
  chatMode: "chat",
  setChatMode: (chatMode) => set({ chatMode }),
  optimisticAgentSteps: null,
  setOptimisticAgentSteps: (optimisticAgentSteps) =>
    set({ optimisticAgentSteps }),
  liveAgentSteps: [],
  setLiveAgentSteps: (liveAgentSteps) => set({ liveAgentSteps }),
  visionPreset: null,
  setVisionPreset: (visionPreset) => set({ visionPreset }),
  inputImageId: null,
  setInputImageId: (inputImageId) => set({ inputImageId }),
  setOptimisticPrompt: (value: string | null) =>
    set({ optimisticPrompt: value }),
  setInputImgName: (value: string | null) => set({ inputImgName: value }),
  currChat: { userPrompt: "", llmResponse: "" },
  setTopLoader: (topLoader) => set({ topLoader }),
  setMsgLoader: (msgLoader) => set({ msgLoader }),
  setOptimisticResponse: (optimisticResponse: string | null) =>
    set({ optimisticResponse }),
  setPrevChat: (newChat: Message) => set({ prevChat: newChat }),
  setCurrChat: (name: string | null, value: string | null) =>
    set((state) => ({
      currChat: { ...state.currChat, [name as string]: value },
    })),
  setUserData: (userData: User) => set({ userData }),
}));

export default geminiZustand;
