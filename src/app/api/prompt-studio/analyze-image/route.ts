import { NextRequest, NextResponse } from 'next/server';
import { genAI, GEMINI_STANDARD } from '@/lib/gemini';
import { parseAIJSON } from '@/lib/parse-ai';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const prompt = `Analyze this image and create a detailed JSON prompt that would help recreate a similar image using AI image generation tools.

Study the image carefully and extract:
- Subject and composition
- Lighting style and quality
- Color palette and mood
- Camera angle and perspective
- Artistic style and rendering technique
- Background and environment

Respond with ONLY this JSON structure, no other text:
{
  "prompt": "Detailed main prompt to recreate similar image. Start with subject, then environment, lighting, style, technical specs. Be specific and descriptive.",
  "negative_prompt": "Elements to avoid for best results",
  "style": "photorealistic / cinematic / illustration / 3d render / concept art / etc",
  "aspect_ratio": "detected or suggested: 16:9 / 9:16 / 1:1 / etc",
  "lighting": {
    "type": "lighting type (natural/studio/dramatic/etc)",
    "direction": "light source direction",
    "quality": "hard/soft/diffused/etc",
    "mood": "atmospheric description"
  },
  "camera": {
    "angle": "camera angle description",
    "lens": "focal length suggestion (wide/normal/telephoto)",
    "depth_of_field": "shallow/deep/medium"
  },
  "color_profile": {
    "dominant_colors": ["color1", "color2", "color3"],
    "palette": "palette name/description",
    "saturation": "low/medium/high/vibrant",
    "temperature": "warm/cool/neutral"
  },
  "composition": {
    "rule_applied": "rule of thirds / center / golden ratio / etc",
    "perspective": "perspective type",
    "framing": "framing description"
  },
  "technical_specs": {
    "medium": "photography / CGI / illustration / etc",
    "style_reference": "cinematic style or artist reference",
    "quality_tags": "8k, photorealistic, high detail, etc"
  },
  "model_suggestion": "Best AI model: Midjourney / Stable Diffusion / Ideogram / Flux / DALL-E",
  "confidence_score": 0.95
}`;

    // Clean up base64 prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const finalMimeType = mimeType || 'image/jpeg';
    
    const imageUrl = `data:${finalMimeType};base64,${base64Data}`;

    const completion = await genAI.chat.completions.create({
      model: GEMINI_STANDARD,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.6
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = parseAIJSON(text);

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse AI JSON" }, { status: 500 });
    }

    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error: any) {
    console.error("Image analysis error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze image" }, { status: 500 });
  }
}
