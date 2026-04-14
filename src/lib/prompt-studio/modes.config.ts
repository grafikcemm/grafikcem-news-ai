import type { ModeConfig } from "./types";

export const MODES_CONFIG: ModeConfig[] = [
  {
    id: "image_video",
    label: "Görsel / Video",
    icon: "🎨",
    tooltip: "Midjourney, DALL-E, Sora, Kling, Runway için görsel ve video promptları",
    systemPrompt: `You are an expert AI image and video prompt engineer.
You create highly detailed, structured prompts in JSON format.
Always respond in English. Never use Turkish in prompts.
Output ONLY valid JSON, nothing else.`,
  },
];

export function getModeConfig(mode: string): ModeConfig | undefined {
  return MODES_CONFIG.find((m) => m.id === mode);
}
