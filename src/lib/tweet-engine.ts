import { GRAFIKCEM_SYSTEM } from "@/lib/personas/grafikcem";
import { MASKULENKOD_SYSTEM } from "@/lib/personas/maskulenkod";
import { SPORHABERLERI_SYSTEM } from "@/lib/personas/sporhaberleri";

export type TweetAccount = "grafikcem" | "maskulenkod" | "sporhaberleri";
export type TweetMode = "tweet" | "quote" | "reply" | "article";
export type TweetFormat = "micro" | "punch" | "spark" | "storm" | "thread";
export type TweetCharacter =
  | "Saf"
  | "Otorite"
  | "Insider"
  | "Mentalist"
  | "Haber"
  | "Ham düşünce akışı"
  | "Mentor";
export type TweetTone = "Natural" | "Raw" | "Polished" | "Unhinged";
export type TweetKnowledge = "insider" | "contrarian" | "hidden" | "expert";
export type TweetLanguage = "Otomatik" | "Türkçe" | "English";
export type ThreadTweetType = "hook" | "value" | "cta";

export interface ThreadTweet {
  step: number;
  type: ThreadTweetType;
  text: string;
}

export interface AccountDefaults {
  character: TweetCharacter;
  tone: TweetTone;
  knowledge: TweetKnowledge;
  language: TweetLanguage;
}

export interface AccountConfig {
  id: TweetAccount;
  handle: string;
  name: string;
  description: string;
  color: string;
  dotClassName: string;
  systemPrompt: string;
  defaults: AccountDefaults;
}

export interface FormatConfig {
  id: TweetFormat;
  label: string;
  description: string;
  rangeLabel: string;
  minChars: number;
  maxChars: number;
  modeLabel: string;
}

export const ACCOUNT_CONFIGS: Record<TweetAccount, AccountConfig> = {
  grafikcem: {
    id: "grafikcem",
    handle: "@grafikcem",
    name: "AI & Tasarım",
    description: "AI araçları, tasarım ve yaratıcı teknoloji",
    color: "#f472b6",
    dotClassName: "bg-pink-400",
    systemPrompt: GRAFIKCEM_SYSTEM,
    defaults: {
      character: "Otorite",
      tone: "Natural",
      knowledge: "expert",
      language: "Türkçe",
    },
  },
  maskulenkod: {
    id: "maskulenkod",
    handle: "@maskulenkod",
    name: "Maskülenite",
    description: "Disiplin, zihinsel güç ve erkek gelişimi",
    color: "#60a5fa",
    dotClassName: "bg-sky-400",
    systemPrompt: MASKULENKOD_SYSTEM,
    defaults: {
      character: "Mentor",
      tone: "Raw",
      knowledge: "insider",
      language: "Türkçe",
    },
  },
  sporhaberleri: {
    id: "sporhaberleri",
    handle: "@sporhaberleri",
    name: "Spor",
    description: "Güncel spor haberleri ve maç içgörüleri",
    color: "#4ade80",
    dotClassName: "bg-emerald-400",
    systemPrompt: SPORHABERLERI_SYSTEM,
    defaults: {
      character: "Haber",
      tone: "Natural",
      knowledge: "insider",
      language: "Türkçe",
    },
  },
};

export const MODE_OPTIONS: Array<{ id: TweetMode; label: string }> = [
  { id: "tweet", label: "Tweet" },
  { id: "quote", label: "Alıntı" },
  { id: "reply", label: "Yanıt" },
  { id: "article", label: "Makale" },
];

export const FORMAT_CONFIGS: FormatConfig[] = [
  {
    id: "micro",
    label: "Micro",
    description: "Keskin, tek cümle",
    rangeLabel: "50-140 kar.",
    minChars: 50,
    maxChars: 140,
    modeLabel: "Tek atış",
  },
  {
    id: "punch",
    label: "Punch",
    description: "Direkt etki",
    rangeLabel: "140-280 kar.",
    minChars: 140,
    maxChars: 280,
    modeLabel: "Direkt vur",
  },
  {
    id: "spark",
    label: "Spark",
    description: "Değer + fikir",
    rangeLabel: "400-600 kar.",
    minChars: 400,
    maxChars: 600,
    modeLabel: "Kısa analiz",
  },
  {
    id: "storm",
    label: "Storm",
    description: "Derin analiz",
    rangeLabel: "600-900 kar.",
    minChars: 600,
    maxChars: 900,
    modeLabel: "Uzun form",
  },
  {
    id: "thread",
    label: "Thread",
    description: "5-8 tweet hikaye akışı",
    rangeLabel: "5-8 tweet",
    minChars: 0,
    maxChars: 0,
    modeLabel: "Zincir akış",
  },
];

export const CHARACTER_OPTIONS: Array<{ value: TweetCharacter; description: string }> = [
  { value: "Saf", description: "Kişisel deneyim, birinci ağız" },
  { value: "Otorite", description: "Uzman bakışı, analitik" },
  { value: "Insider", description: "\"Kimsenin bilmediği\" tonu" },
  { value: "Mentalist", description: "Psikoloji + zihinsel çerçeve" },
  { value: "Haber", description: "Haber dili, bilgi odaklı" },
  { value: "Ham düşünce akışı", description: "Filtresiz, akış halinde" },
  { value: "Mentor", description: "Yol gösteren, net ve sert" },
];

export const TONE_OPTIONS: Array<{ value: TweetTone; description: string }> = [
  { value: "Natural", description: "Sohbet dili, samimi" },
  { value: "Raw", description: "Kaba, direkt, sansürsüz" },
  { value: "Polished", description: "Cilalı, profesyonel" },
  { value: "Unhinged", description: "Şok edici, provokatif" },
];

export const KNOWLEDGE_OPTIONS: Array<{ value: TweetKnowledge; description: string }> = [
  { value: "insider", description: "Piyasa içi bilgi" },
  { value: "contrarian", description: "Aksi görüş, karşı tez" },
  { value: "hidden", description: "Gizli kalmış bilgi" },
  { value: "expert", description: "Teknik derinlik" },
];

export const LANGUAGE_OPTIONS: Array<{ value: TweetLanguage; description: string }> = [
  { value: "Otomatik", description: "Konuyu otomatik algıla" },
  { value: "Türkçe", description: "Türkçe yaz" },
  { value: "English", description: "Write in English" },
];

export const SPORTS_THEMES = ["Dramatik", "Minimal", "Energetik"] as const;

export function getFormatConfig(format: TweetFormat): FormatConfig {
  return FORMAT_CONFIGS.find((item) => item.id === format) ?? FORMAT_CONFIGS[0];
}

export function clampText(text: string, maxLength: number) {
  return text.trim().slice(0, maxLength);
}

export function truncateReference(text: string, maxLength = 140) {
  return clampText(text, maxLength);
}

export function buildTweetInstruction(mode: TweetMode, format: TweetFormat) {
  const formatConfig = getFormatConfig(format);

  const modeInstruction = {
    tweet: "Normal X postu üret.",
    quote: "Bir başkasının tweet'ine alıntı yapıyormuş gibi yaz.",
    reply: "Yanıt gibi yaz; kısa, keskin ve tartışma açan olsun.",
    article: "Tweet dizisi değil; daha bilgi odaklı, makale özet hissi veren tek post üret.",
  }[mode];

  if (format === "thread") {
    return `${modeInstruction} 5 ila 8 tweetlik zincir kur.`;
  }

  return `${modeInstruction} Hedef uzunluk ${formatConfig.rangeLabel}.`;
}
