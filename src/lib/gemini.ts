import { GoogleGenerativeAI } from '@google/generative-ai'

export const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY!
)

// Model sabitleri — doğrulanmış API stringleri
export const GEMINI_FAST = 'gemini-3.1-flash-lite-preview'      // Haber filtreleme, cron, skorlama
export const GEMINI_STANDARD = 'gemini-3-flash-preview'          // Tweet, carousel, prompt studio

// Gemini 3 serisi için thinkingConfig kullanılıyor (temperature artık çalışmıyor)
// thinking_level: minimal = en hızlı/ucuz | high = en derin reasoning

export async function generateWithGemini(
  prompt: string,
  mode: 'creative' | 'analytical' | 'planning' = 'creative',
  systemPrompt?: string,
  modelName = GEMINI_STANDARD
): Promise<string> {
  try {
    // Gemini 3.1 Flash Lite için thinking_level minimal (hız öncelikli)
    // Gemini 3 Flash için thinking_level low (kalite/hız dengesi)
    const thinkingLevel = modelName === GEMINI_FAST ? 'minimal' : 'low'

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    })

    // Thinking level'ı request body'ye ekle
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: mode === 'planning' ? 8192 : 4096,
        thinkingConfig: { thinking_level: thinkingLevel }
      } as any,
    })

    const response = await result.response
    const text = response.text()
    if (!text) throw new Error('Empty response from Gemini')
    return text
  } catch (err) {
    console.error('Gemini API error:', err)
    throw err
  }
}

// Convenience wrapper — fast model için
export async function generateWithGeminiFast(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  return generateWithGemini(prompt, 'analytical', systemPrompt, GEMINI_FAST)
}
