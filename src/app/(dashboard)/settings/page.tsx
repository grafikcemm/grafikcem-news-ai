import { supabaseAdmin } from "@/lib/supabase";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Read current custom voice prompt
  const { data: settings } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "custom_voice_prompt")
    .single();

  const customVoicePrompt = settings?.value || "";

  // Mask env variables (show only last 4 chars)
  const mask = (val?: string) => {
    if (!val) return "Ayarlanmadı";
    if (val.length <= 4) return "****";
    return `*`.repeat(16) + val.slice(-4);
  };

  const envs = {
    xApiKey: mask(process.env.TWITTER_API_KEY),
    xApiSecret: mask(process.env.TWITTER_API_SECRET),
    xAccessToken: mask(process.env.TWITTER_ACCESS_TOKEN),
    xAccessSecret: mask(process.env.TWITTER_ACCESS_TOKEN_SECRET),
    anthropicKey: mask(process.env.ANTHROPIC_API_KEY),
  };

  return <SettingsClient initialPrompt={customVoicePrompt} envs={envs} />;
}
