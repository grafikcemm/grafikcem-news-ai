import { NextRequest, NextResponse } from "next/server";

/**
 * Validates API requests from dashboard UI (via cookie) or external callers (via x-api-key).
 * In development (no DASHBOARD_API_SECRET set), all requests pass.
 */
export function validateApiRequest(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_API_SECRET;
  if (!secret) return true; // dev mode — skip auth

  // Accept x-api-key header (for direct/external API access)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey === secret) return true;

  // Accept gc_auth cookie (for dashboard client-side calls from logged-in users)
  const cookie = req.cookies.get("gc_auth");
  const dashPass = process.env.DASHBOARD_PASSWORD;
  if (dashPass && cookie?.value === dashPass) return true;

  return false;
}

/**
 * Validates cron/admin requests.
 * Accepts: Vercel auto-cron header, Authorization header, or x-cron-secret header.
 */
export function validateCronRequest(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev mode
  if (req.headers.get("authorization") === cronSecret) return true;
  if (req.headers.get("x-cron-secret") === cronSecret) return true;
  return false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
