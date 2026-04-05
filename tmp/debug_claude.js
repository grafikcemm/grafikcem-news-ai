require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');

async function testContentPlan() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY MISSING');
    return;
  }
  const anthropic = new Anthropic({ apiKey });

  console.log('Testing Claude API with model: claude-3-haiku-20240307');
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      messages: [{ role: "user", content: "Hi, just say 'API OK'" }],
    });
    console.log('Claude response:', response.content[0].text);
  } catch (err) {
    console.error('Claude API Error:', err.message);
  }
}

testContentPlan();
