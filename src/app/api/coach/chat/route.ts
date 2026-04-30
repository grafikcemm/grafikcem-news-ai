import { NextRequest, NextResponse } from 'next/server'
import { generateWithGemini, GEMINI_STANDARD } from '@/lib/gemini'

export const runtime = 'edge'

const SYSTEM_PROMPT = `Sen @grafikcem (Cem) için özel bir X (Twitter) büyüme koçusun. 
Grafik tasarım, AI araçları ve freelancer yaşam tarzı konularında uzmansın. 
Kullanıcıya spesifik, uygulanabilir ve samimi tavsiyeler ver. 
Vaaz verme, pratik ol. Yanıtlarını kısa tut ve X dinamiklerine uygun konuş.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const lastMessage = messages[messages.length - 1].content

    // We'll use a simple non-streaming for now but return as stream to match UI expectation 
    // or use a real stream if gemini lib supports it. 
    // For now, I will use a simple implementation that returns the response.
    
    const response = await generateWithGemini(
      `${SYSTEM_PROMPT}\n\nKullanıcı: ${lastMessage}`,
      'creative',
      undefined,
      GEMINI_STANDARD
    )

    // Simulate streaming for the frontend
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const chunks = response.split(' ')
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk + ' '))
          await new Promise(r => setTimeout(r, 30))
        }
        controller.close()
      }
    })

    return new Response(stream)
  } catch (err) {
    console.error('AI Coach error:', err)
    return NextResponse.json({ error: 'Koç şu an meşgul, lütfen sonra tekrar dene.' }, { status: 500 })
  }
}
