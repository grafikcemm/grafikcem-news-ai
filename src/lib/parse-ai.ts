export function parseAIJSON<T = any>(text: string): T | null {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const startBrace = cleaned.indexOf('{')
    const startBracket = cleaned.indexOf('[')

    // If array starts before object, or no object exists
    if (startBracket !== -1 && (startBrace === -1 || startBracket < startBrace)) {
      const endBracket = cleaned.lastIndexOf(']')
      if (endBracket !== -1) {
        return JSON.parse(cleaned.slice(startBracket, endBracket + 1))
      }
    }

    const startBraceActual = cleaned.indexOf('{')
    const endBrace = cleaned.lastIndexOf('}')

    if (startBraceActual !== -1 && endBrace !== -1) {
      return JSON.parse(cleaned.slice(startBraceActual, endBrace + 1))
    }

    throw new Error('No JSON structure found')
  } catch (err) {
    console.error('parseAIJSON failed:', err)
    console.error('Raw text:', text.slice(0, 500))
    return null
  }
}
