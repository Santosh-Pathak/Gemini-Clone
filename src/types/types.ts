export type RagSource = {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
};

export type AgentStep = {
  tool: string;
  label: string;
  status: "running" | "done" | "error";
  latencyMs?: number;
  preview?: string;
};

export type Message = {
  userPrompt: string;
  llmResponse: string;
  imgName?: string;
  imageId?: string;
  ragSources?: RagSource[];
  agentSteps?: AgentStep[];
};

export type SessionProps = {
  email: string;
  id: string;
  name: string;
  image: string;
};

export type MessageProps = {
  _id: string;
  message: Message;
};

export type ChatSectionProps = {
  data: {
    message?: MessageProps[];
  };
  image: string;
  name: string;
};

export type KnowledgeDocumentSummary = {
  id: string;
  fileName: string;
  mimeType: string;
  chunkCount: number;
  charCount: number;
  createdAt?: string;
};

export type ChatMode = "chat" | "agent";

export type VisionPresetId = "describe" | "ocr" | "diagram";
