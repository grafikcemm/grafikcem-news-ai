const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/tweet/generate/route.ts',
  'src/app/api/storyboard/scenes/route.ts',
  'src/app/api/storyboard/hook/route.ts',
  'src/app/api/reports/pricing/route.ts',
  'src/app/api/prompt-studio/generate/route.ts',
  'src/app/api/news/score-all/route.ts',
  'src/app/api/news/score/route.ts',
  'src/app/api/learning/find-resources/route.ts',
  'src/app/api/leads/analyze/route.ts',
  'src/app/api/cron/generate/route.ts',
  'src/app/api/cron/fetch-news/route.ts',
  'src/app/api/content-plan/generate/route.ts',
  'src/app/api/channels/[channelId]/generate/route.ts'
];

files.forEach(relativePath => {
  const filepath = path.join(__dirname, relativePath);
  if (!fs.existsSync(filepath)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  
  if (!content.includes('parseClaudeJSON')) {
    // Add import after other imports
    const importRegex = /^(import .* from .*;\s*)+/m;
    content = content.replace(importRegex, (match) => {
      return match + `import { parseClaudeJSON } from "@/lib/parse-claude";\n`;
    });
  }

  // Replace JSON.parse(var) with parseClaudeJSON(var)
  content = content.replace(/JSON\.parse\(([^)]+)\)/g, (match, p1) => {
    return `parseClaudeJSON<any>(${p1})`;
  });

  fs.writeFileSync(filepath, content);
  console.log(`Updated ${relativePath}`);
});
