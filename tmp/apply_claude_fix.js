const fs = require('fs');
const path = require('path');

const files = [
  "src/app/api/tweet/generate/route.ts",
  "src/app/api/storyboard/scenes/route.ts",
  "src/app/api/storyboard/hook/route.ts",
  "src/app/api/replies/generate/route.ts",
  "src/app/api/quotes/generate/route.ts",
  "src/app/api/prompt-studio/generate/route.ts",
  "src/app/api/news/score-all/route.ts",
  "src/app/api/news/score/route.ts",
  "src/app/api/news/quote-reply/route.ts",
  "src/app/api/news/article/route.ts",
  "src/app/api/learning/find-resources/route.ts",
  "src/app/api/leads/generate-outreach/route.ts",
  "src/app/api/leads/analyze/route.ts",
  "src/app/api/cron/fetch-news/route.ts",
  "src/app/api/cron/generate/route.ts",
  "src/app/api/competitors/summary/route.ts",
  "src/app/api/channels/[channelId]/generate/route.ts"
];

const replacementPattern = (model, tokens, system, messages, statusLog) => `
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: ${tokens},
        ${system ? `system: ${system},` : ""}
        messages: ${messages},
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(\`Claude API Error: \${anthropicRes.status}\`);
    }

    const response = await anthropicRes.json();
`;

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Regex attempt to find anthropic.messages.create
  // Very simplistic, might need adjustment per file
  const createRegex = /const\s+(\w+)\s*=\s*await\s+anthropic\.messages\.create\(\{([\s\S]*?)\}\);/g;
  
  content = content.replace(createRegex, (match, varName, config) => {
    const modelMatch = config.match(/model:\s*"([^"]+)"/);
    const tokensMatch = config.match(/max_tokens:\s*(\d+)/);
    const systemMatch = config.match(/system:\s*([^,}\n]+)/);
    const messagesMatch = config.match(/messages:\s*([^,}\n]+)/);

    const tokens = tokensMatch ? tokensMatch[1] : "1024";
    const system = systemMatch ? systemMatch[1].trim() : null;
    const messages = messagesMatch ? messagesMatch[1].trim() : "[]";

    return replacementPattern("claude-sonnet-4-5", tokens, system, messages);
  });

  // Clean up unused Anthropic stuff
  content = content.replace(/import Anthropic from "@anthropic-ai\/sdk";\n?/g, "");
  content = content.replace(/const anthropic = new Anthropic\(\{ apiKey \}\);\n?/g, "");

  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${file}`);
});
