import { NextRequest, NextResponse } from "next/server";

/**
 * Validates API requests. Since the application password is removed,
 * dashboard UI requests are always allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateApiRequest(_req: NextRequest): boolean {
  return true;
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
