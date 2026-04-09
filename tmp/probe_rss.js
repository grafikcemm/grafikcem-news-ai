import fetch from 'node-fetch';
import fs from 'fs';

const candidates = {
  "The Verge": ["https://www.theverge.com/rss/index.xml", "https://www.theverge.com/artificial-intelligence/rss/index.xml"],
  "Anthropic": ["https://www.anthropic.com/rss.xml", "https://www.anthropic.com/feed.xml", "https://www.anthropic.com/news/rss"],
  "Figma": ["https://www.figma.com/blog/rss.xml", "https://www.figma.com/blog/rss/", "https://www.figma.com/feed"],
  "n8n": ["https://blog.n8n.io/rss/", "https://n8n.io/blog/rss/", "https://n8n.io/feed/"],
  "Cursor": ["https://cursor.sh/blog/rss", "https://cursor.com/blog/rss.xml", "https://cursor.com/blog/feed.xml", "https://cursor.com/rss.xml"],
  "a16z": ["https://a16z.com/rss", "https://a16z.com/feed"],
  "Every.to": ["https://every.to/rss", "https://every.to/feed.xml", "https://every.to/feed"],
  "AI Breakfast": ["https://aibreakfast.beehiiv.com/rss", "https://aibreakfast.beehiiv.com/feed.xml", "https://aibreakfast.beehiiv.com/feed"]
};

// global fetch to support Node 18+ properly without node-fetch
async function checkCandidates() {
  const results = {};
  for (const [name, urls] of Object.entries(candidates)) {
    for (const url of urls) {
      try {
        const res = await globalThis.fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          results[name] = url;
          break;
        }
      } catch (err) {}
    }
    if (!results[name]) results[name] = "Not Found";
  }
  fs.writeFileSync('tmp/probe.json', JSON.stringify(results, null, 2), 'utf8');
}

checkCandidates();
