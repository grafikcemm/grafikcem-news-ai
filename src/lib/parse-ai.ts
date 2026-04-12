export function parseAIJSON<T = any>(text: string): T | null {
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')

    if (start === -1 || end === -1) {
      const arrStart = cleaned.indexOf('[')
      const arrEnd = cleaned.lastIndexOf(']')
      if (arrStart !== -1 && arrEnd !== -1) {
        return JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      }
      throw new Error('No JSON structure found')
    }

    return JSON.parse(cleaned.slice(start, end + 1))
  } catch (err) {
    console.error('parseAIJSON failed:', err)
    console.error('Raw text:', text.slice(0, 200))
    return null
  }
}
