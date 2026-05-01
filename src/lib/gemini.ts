import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': 'https://grafikcem-news-ai.vercel.app',
    'X-Title': 'GrafikCem News AI',
  },
})

// Model sabitleri — DeepSeek V4 serisi
export const DEEPSEEK_PRO = 'deepseek/deepseek-v4-pro'    // Ağır: tweet, linkedin, carousel
export const DEEPSEEK_FLASH = 'deepseek/deepseek-v4-flash' // Hafif: cron, chat, filtreleme

// Geriye dönük uyumluluk için alias — eski kod değişmesin
export const GEMINI_STANDARD = DEEPSEEK_PRO
export const GEMINI_FAST = DEEPSEEK_FLASH
export const GEMINI_MODEL = DEEPSEEK_PRO

export async function generateWithGemini(
  prompt: string,
  mode: 'creative' | 'analytical' | 'planning' = 'creative',
  systemPrompt?: string,
  modelName: string = DEEPSEEK_PRO
): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const completion = await client.chat.completions.create({
      model: modelName,
      messages,
      max_tokens: mode === 'planning' ? 8192 : 4096,
      temperature: mode === 'creative' ? 0.8 : mode === 'analytical' ? 0.3 : 0.6,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Empty response from DeepSeek')
    return text
  } catch (err) {
    console.error('OpenRouter API error:', err)
    throw err
  }
}

// Convenience wrapper — Flash model için
export async function generateWithGeminiFast(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  return generateWithGemini(prompt, 'analytical', systemPrompt, DEEPSEEK_FLASH)
}

export { client as genAI }
