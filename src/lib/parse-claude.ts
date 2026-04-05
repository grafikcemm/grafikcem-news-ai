export function parseClaudeJSON<T>(raw: string, label: string = "Claude"): T {
  // Try to find the first '{' and the last '}' to extract JSON even if there's surrounding text
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  
  let text = raw;
  if (start !== -1 && end !== -1 && end > start) {
    text = raw.substring(start, end + 1);
  } else {
    // Fallback to previous cleaning logic if no braces found
    text = raw
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
  }
    
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[${label}] Invalid JSON from Claude:`, text.slice(0, 400));
    console.error(`[${label}] Original text:`, raw.slice(0, 400));
    throw new Error(`AI model returned invalid JSON response: ${err instanceof Error ? err.message : String(err)}`);
  }
}
