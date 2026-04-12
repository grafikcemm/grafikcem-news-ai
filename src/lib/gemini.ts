import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY!
)

export const GEMINI_MODEL = 'gemini-3-flash-preview'

const CONFIGS: Record<string, GenerationConfig> = {
  creative: {
    temperature: 0.9,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
  analytical: {
    temperature: 0.3,
    topP: 0.85,
    maxOutputTokens: 8192,
  },
  planning: {
    temperature: 0.6,
    topP: 0.90,
    maxOutputTokens: 8192,
  },
}

export async function generateWithGemini(
  prompt: string,
  mode: 'creative' | 'analytical' | 'planning' = 'creative',
  systemPrompt?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: CONFIGS[mode],
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) throw new Error('Empty response from Gemini')
    return text
  } catch (err) {
    console.error('Gemini API error:', err)
    throw err
  }
}
