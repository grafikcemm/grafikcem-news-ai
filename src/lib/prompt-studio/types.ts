export type Mode = "image_video" | "deep_research" | "content" | "script" | "idea";

export interface Variation {
  label: string;
  icon: string;
  prompt: string;
  negative_prompt?: string;
  best_for: string;
}

export interface GenerateResponse {
  mode: Mode;
  variations: Variation[];
}

export interface HistoryEntry {
  id: string;
  mode: Mode;
  userInput: string;
  variations: Variation[];
  createdAt: string;
}

export interface ModeConfig {
  id: Mode;
  label: string;
  icon: string;
  tooltip: string;
  systemPrompt: string;
}
