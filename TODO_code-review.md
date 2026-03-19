# Code Review — GrafikCem News AI

## Context

- **Language / Framework**: TypeScript · Next.js 16 App Router (React 19)
- **Paradigm**: Full-stack SaaS, server-side API routes + client-side dashboard
- **Purpose**: AI-powered content pipeline — RSS ingestion, Claude scoring/generation, multi-channel publishing assistant
- **Scope**: All files under `src/` — 15 API routes, 10 dashboard pages, 3 lib modules, sidebar component
- **Assumptions**:
  - Single-owner personal tool (not multi-tenant SaaS) — auth risk is lower than enterprise, but still real
  - Vercel Hobby tier constraints apply (maxDuration = 60s, no Edge middleware)
  - No existing test suite

---

## Review Plan

- [ ] **CR-PLAN-1.1 [Authentication & Authorization]**
  - **Scope**: All `/src/app/api/` routes, `/src/app/page.tsx`, layout files
  - **Focus**: Missing auth guards on public endpoints
  - **Priority**: Critical
  - **Estimated Impact**: Any person with the URL can trigger Claude calls, corrupt content, or read generated drafts

- [ ] **CR-PLAN-1.2 [Input Validation]**
  - **Scope**: All POST/PATCH handlers
  - **Focus**: Missing schema validation, unbounded arrays, unsafe type casts
  - **Priority**: Critical
  - **Estimated Impact**: Malformed input crashes routes or triggers unexpected behaviour

- [ ] **CR-PLAN-1.3 [Security — SSRF & Injection]**
  - **Scope**: `/api/news/article/route.ts`, Supabase query patterns
  - **Focus**: Arbitrary URL fetch, raw HTML parsing
  - **Priority**: High
  - **Estimated Impact**: SSRF via DB-stored URL; regex HTML stripping is fragile

- [ ] **CR-PLAN-1.4 [Error Handling]**
  - **Scope**: `/api/prompt-studio/generate`, `/api/coach/chat`, all batch loops
  - **Focus**: Bare JSON.parse, stream error format mismatch
  - **Priority**: High
  - **Estimated Impact**: Uncaught parse errors return 500 with no user feedback; streaming error leaks JSON into stream

- [ ] **CR-PLAN-1.5 [Performance & Cost]**
  - **Scope**: Cron routes, `/api/news/score`, `/api/analysis/optimal-times`
  - **Focus**: Unbounded queries, missing limits, repeated Anthropic calls
  - **Priority**: Medium
  - **Estimated Impact**: Runaway Claude costs, Vercel timeout kills, heavy DB fetches

- [ ] **CR-PLAN-1.6 [Code Quality & Maintainability]**
  - **Scope**: Prompt files, route duplication, type safety gaps
  - **Focus**: Repeated auth block, loose `unknown` casts, dead dependencies
  - **Priority**: Medium
  - **Estimated Impact**: Maintenance burden, TypeScript false safety

- [ ] **CR-PLAN-1.7 [Configuration & Environment]**
  - **Scope**: `package.json`, `.env.local` pattern, `vercel.json`
  - **Focus**: Missing `.env.example`, unused Twitter dependency, cron schedule alignment
  - **Priority**: Low
  - **Estimated Impact**: Onboarding friction, stale dependency shipping to prod

---

## Review Findings

### 🔴 CRITICAL — Must Fix

- [ ] **CR-ITEM-1.1 [No Authentication on Public API Routes]**
  - **Severity**: Critical
  - **Location**: All of the following routes have zero auth:
    - `src/app/api/news/score/route.ts`
    - `src/app/api/news/article/route.ts`
    - `src/app/api/channels/[channelId]/generate/route.ts`
    - `src/app/api/channels/[channelId]/content/route.ts`
    - `src/app/api/quotes/generate/route.ts`
    - `src/app/api/replies/generate/route.ts`
    - `src/app/api/style/profile/route.ts`
    - `src/app/api/coach/chat/route.ts`
    - `src/app/api/prompt-studio/generate/route.ts`
    - `src/app/api/analysis/optimal-times/route.ts`
  - **Description**: Any HTTP client can call these endpoints. Content generation routes trigger paid Claude API calls. PATCH on `/api/channels/[channelId]/content` lets anyone mark drafts as used/rejected. Style profile POST lets anyone overwrite channel writing style.
  - **Recommendation**: Add a lightweight shared auth check. Simplest option for a single-owner tool: validate a `Bearer` token from `CRON_SECRET` (or a separate `ADMIN_SECRET`) on every non-Vercel-cron route. Extract into a helper:
    ```typescript
    // src/lib/auth.ts
    import { NextRequest, NextResponse } from "next/server";
    export function requireAuth(req: NextRequest): NextResponse | null {
      const token = req.headers.get("authorization");
      if (token !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return null;
    }
    ```
    Call `const denied = requireAuth(request); if (denied) return denied;` at the top of each handler.

- [ ] **CR-ITEM-1.2 [No Dashboard Authentication — Any URL is Accessible]**
  - **Severity**: Critical
  - **Location**: `src/app/page.tsx` (redirects to `/dashboard`), `src/app/(dashboard)/layout.tsx`
  - **Description**: Navigating to `https://your-vercel-url.vercel.app/dashboard` serves the full dashboard to anyone. There is no session check, middleware guard, or login flow.
  - **Recommendation**: Add Next.js middleware at `src/middleware.ts` with a simple password check (or Supabase Auth session) before serving the `(dashboard)` group:
    ```typescript
    // src/middleware.ts
    import { NextRequest, NextResponse } from "next/server";
    export function middleware(req: NextRequest) {
      const session = req.cookies.get("session")?.value;
      if (!session || session !== process.env.ADMIN_SECRET) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
    export const config = { matcher: ["/dashboard/:path*", "/channels/:path*", "/news-pool", "/tweet-generator", "/style-profile", "/sources", "/settings", "/ai-coach", "/quote-suggestions"] };
    ```

---

### 🟠 WARNING — Should Fix

- [ ] **CR-ITEM-2.1 [Bare JSON.parse — crash on invalid Claude response]**
  - **Severity**: Warning
  - **Location**: `src/app/api/prompt-studio/generate/route.ts:35`
    ```typescript
    const parsed = JSON.parse(text); // no try-catch
    ```
  - **Description**: If Claude returns malformed JSON (rate-limited response, partial stream, content-policy message), this throws and the route returns an unhandled 500 with no useful message.
  - **Recommendation**:
    ```typescript
    let parsed: { variations: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[prompt-studio] Invalid JSON from Claude:", text.slice(0, 300));
      return NextResponse.json({ error: "Model returned invalid response. Try again." }, { status: 502 });
    }
    ```

- [ ] **CR-ITEM-2.2 [SSRF — Arbitrary URL Fetch from Database]**
  - **Severity**: Warning
  - **Location**: `src/app/api/news/article/route.ts` (URL fetched from `news_items.url`)
  - **Description**: The route fetches `item.url` directly from the database without validating the hostname. If a malicious URL is inserted into `news_items` (e.g., via a crafted RSS feed), it could fetch cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/`) or internal services.
  - **Recommendation**: Validate the URL scheme and hostname before fetching:
    ```typescript
    const parsed = new URL(item.url);
    const BLOCKED = ["169.254.", "10.", "172.16.", "192.168.", "localhost", "127.0.0.1"];
    if (parsed.protocol !== "https:" || BLOCKED.some(b => parsed.hostname.startsWith(b))) {
      return NextResponse.json({ error: "Invalid article URL" }, { status: 400 });
    }
    ```

- [ ] **CR-ITEM-2.3 [Stream Error Returns JSON — Breaks Chunked Response]**
  - **Severity**: Warning
  - **Location**: `src/app/api/coach/chat/route.ts` — catch block
  - **Description**: The route starts a `text/plain` chunked stream, but if an error occurs mid-stream, the catch block tries to return `NextResponse.json(...)`, which conflicts with the already-sent headers. The client receives a broken stream.
  - **Recommendation**: Handle errors before the stream starts. Move all DB lookups and validations above the `TransformStream` creation. Inside the stream writer, use `writer.abort(err)` on failure.

- [ ] **CR-ITEM-2.4 [Unbounded news_ids Array in /api/news/score]**
  - **Severity**: Warning
  - **Location**: `src/app/api/news/score/route.ts`
  - **Description**: The route accepts `{ news_ids: string[] }` with no maximum length check. Passing 1000 IDs would trigger 100 Claude batches, consuming significant API credits in one request.
  - **Recommendation**: Add `if (news_ids.length > 30) return NextResponse.json({ error: "Max 30 items per request" }, { status: 400 });`

- [ ] **CR-ITEM-2.5 [Regex HTML Stripping — Fragile and Unsafe]**
  - **Severity**: Warning
  - **Location**: `src/app/api/news/article/route.ts` — HTML parsing section
  - **Description**: Manual regex (`replace(/<script[\s\S]*?<\/script>/gi, "")` etc.) is notoriously fragile. Encoded entities, nested tags, CDATA sections, and malformed HTML all bypass it. Content sent to Claude may contain injected text from malicious article pages.
  - **Recommendation**: Replace with `cheerio`:
    ```typescript
    import * as cheerio from "cheerio";
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside").remove();
    const text = $("article, main, body").text().replace(/\s+/g, " ").trim().slice(0, 4000);
    ```
    (`cheerio` is a lightweight, battle-tested HTML parser.)

- [ ] **CR-ITEM-2.6 [Duplicate Auth Block — DRY Violation]**
  - **Severity**: Warning
  - **Location**: `src/app/api/cron/fetch-news/route.ts:19-26` and `src/app/api/cron/generate/route.ts:11-14`
  - **Description**: Identical 4-line auth check (authorization header + x-vercel-cron) is copy-pasted across both cron routes. Will diverge over time.
  - **Recommendation**: Extract to `src/lib/auth.ts` as `requireCronAuth(req)` returning `NextResponse | null`.

- [ ] **CR-ITEM-2.7 [TypeScript `unknown` Cast Hides Real Type Errors]**
  - **Severity**: Warning
  - **Location**: `src/app/api/cron/generate/route.ts:53`, `src/app/api/channels/[channelId]/generate/route.ts:43`
    ```typescript
    (news.sources as unknown as { name: string } | null)?.name
    ```
  - **Description**: The double cast `as unknown as X` bypasses TypeScript's type checker entirely. This exists because Supabase's inferred type for a joined relation is `{ name: any }[]` (array), not a single object. The cast silently hides a potential runtime bug: if `sources` is an array (Supabase default for joins), `.name` on the array returns `undefined`.
  - **Recommendation**: Use the correct Supabase join syntax or extract safely:
    ```typescript
    const sourceName = Array.isArray(news.sources)
      ? (news.sources[0] as { name: string } | undefined)?.name
      : (news.sources as { name: string } | null)?.name;
    ```

- [ ] **CR-ITEM-2.8 [No Rate Limiting on Any Public Endpoint]**
  - **Severity**: Warning
  - **Location**: All API routes
  - **Description**: No rate limiting exists at middleware or route level. A single IP can call `/api/prompt-studio/generate` in a tight loop, generating hundreds of paid Claude calls per minute.
  - **Recommendation**: Add Vercel's built-in rate limiting (Vercel Pro feature) or use `upstash/ratelimit` with Redis:
    ```typescript
    import { Ratelimit } from "@upstash/ratelimit";
    import { Redis } from "@upstash/redis";
    const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "1 m") });
    const { success } = await ratelimit.limit(ip);
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    ```

---

### 🟡 SUGGESTION — Nice to Have

- [ ] **CR-ITEM-3.1 [Dead Dependency — twitter-api-v2]**
  - **Severity**: Suggestion
  - **Location**: `package.json`, `src/app/api/style/analyze/route.ts`
  - **Description**: `twitter-api-v2` package is still in `package.json` and `style/analyze/route.ts` still imports it — despite Twitter API being removed from the active UI. This adds bundle weight and a stale dependency to update.
  - **Recommendation**: Remove `twitter-api-v2` from `package.json` (`npm uninstall twitter-api-v2`) and delete or archive `src/app/api/style/analyze/route.ts`.

- [ ] **CR-ITEM-3.2 [Missing .env.example File]**
  - **Severity**: Suggestion
  - **Location**: Project root (file does not exist)
  - **Description**: No `.env.example` is provided. Required variables (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are undocumented for any future contributor or deployment.
  - **Recommendation**: Create `.env.example`:
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    ANTHROPIC_API_KEY=sk-ant-...
    CRON_SECRET=your-random-secret
    ADMIN_SECRET=your-dashboard-password
    ```

- [ ] **CR-ITEM-3.3 [Hardcoded Cron Description is Stale]**
  - **Severity**: Suggestion
  - **Location**: `src/app/(dashboard)/settings/client.tsx:144-153`
  - **Description**: The cron info card shows `*/30 * * * * (Her 30 dk)` for news fetching, but `vercel.json` has it set to `0 */2 * * *` (every 2 hours). The UI is wrong.
  - **Recommendation**: Update display to `0 */2 * * * (Her 2 saatte bir)` to match `vercel.json`.

- [ ] **CR-ITEM-3.4 [Prompt Studio History Uses localStorage Without Expiry]**
  - **Severity**: Suggestion
  - **Location**: `src/app/(dashboard)/dashboard/prompt-studio/page.tsx`
  - **Description**: History entries accumulate in `localStorage` indefinitely except for the 5-item slice. Old entries with large prompt text persist in storage without cleanup.
  - **Recommendation**: Already capped at 5 entries — acceptable. Optionally add an entry TTL (e.g., discard entries older than 30 days) on load.

- [ ] **CR-ITEM-3.5 [Missing Supabase Migration — style_profile Column]**
  - **Severity**: Suggestion
  - **Location**: `src/app/api/style/profile/route.ts` — depends on `channel_settings.style_profile JSONB`
  - **Description**: The migration `ALTER TABLE channel_settings ADD COLUMN IF NOT EXISTS style_profile JSONB;` is documented in conversation history but no `.sql` migration file exists in the repo. A fresh deploy would silently fail on POST /api/style/profile.
  - **Recommendation**: Add `supabase-migration-v3.sql` to the repo:
    ```sql
    ALTER TABLE channel_settings ADD COLUMN IF NOT EXISTS style_profile JSONB;
    ```

- [ ] **CR-ITEM-3.6 [No Error Boundary on Streaming Coach Chat]**
  - **Severity**: Suggestion
  - **Location**: `src/app/(dashboard)/ai-coach/page.tsx` (client-side stream consumer)
  - **Description**: If the stream is aborted mid-response (network drop, server error), the client-side reader may hang or show incomplete content with no error UI.
  - **Recommendation**: Wrap the stream reader in a try-catch and set an error state that renders a retry button.

- [ ] **CR-ITEM-3.7 [Content Length Not Validated Before Saving to DB]**
  - **Severity**: Suggestion
  - **Location**: `src/app/api/channels/[channelId]/content/route.ts:49`
    ```typescript
    if (content !== undefined) updates.content = content;
    ```
  - **Description**: No maximum length check on `content` before writing to DB. A client could PATCH 1MB of text into a tweet draft.
  - **Recommendation**: Add `if (content !== undefined && content.length > 5000) return NextResponse.json({ error: "Content too long" }, { status: 400 });`

---

## Proposed Code Changes

### CR-ITEM-1.1 + CR-ITEM-1.2 — Auth Helper (new file)

```typescript
// src/lib/auth.ts
import { NextRequest, NextResponse } from "next/server";

export function requireAuth(req: NextRequest): NextResponse | null {
  const token = req.headers.get("authorization");
  if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireCronAuth(req: NextRequest): NextResponse | null {
  const cronHeader = req.headers.get("x-vercel-cron");
  const authHeader = req.headers.get("authorization");
  if (cronHeader !== "1" && authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
```

Usage in any route:
```typescript
const denied = requireAuth(request);
if (denied) return denied;
```

### CR-ITEM-2.1 — Safe JSON Parse Wrapper

```typescript
// src/lib/parse-claude.ts
export function parseClaudeJSON<T>(raw: string, label: string): T {
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[${label}] Invalid JSON from Claude:`, text.slice(0, 400));
    throw new Error("Model returned invalid response");
  }
}
```

### CR-ITEM-3.1 — Remove Dead Dependency

```bash
npm uninstall twitter-api-v2
# Then delete: src/app/api/style/analyze/route.ts
```

---

## Commands

```bash
# Verify build after changes
npm run build

# Check for remaining old model strings
grep -r "claude-haiku\|claude-sonnet-4-20" src/

# Check for bare JSON.parse (should return only safe locations)
grep -rn "JSON\.parse" src/app/api/

# Remove dead Twitter dependency (after deleting style/analyze/route.ts)
npm uninstall twitter-api-v2

# Verify no secrets in git history
git log --all --full-history -- .env*
git grep -i "sk-ant\|service_role" $(git rev-list --all)
```

---

## Quality Assurance Checklist

- [x] Every finding references specific code, not abstract advice
- [x] Critical issues (CR-ITEM-1.x) are separated from warnings (CR-ITEM-2.x) and suggestions (CR-ITEM-3.x)
- [x] Security vulnerabilities include mitigation recommendations (CR-ITEM-1.1, 1.2, 2.2, 2.8)
- [x] Performance issues include concrete optimization paths (CR-ITEM-2.4, CR-ITEM-2.5)
- [x] All findings have stable Task IDs for tracking
- [x] Proposed code changes are provided as labeled blocks
- [x] Review does not exceed scope or introduce unrelated changes
