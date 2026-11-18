import { POST as botPost } from "@/app/api/bot/route";

export const dynamic = "force-dynamic";

/**
 * Lets a free scheduler (e.g. cron-job.org) run the payout bot every few minutes:
 *   https://YOUR-SITE/api/cron?key=YOUR_CRON_KEY
 * Requires CRON_KEY env var.
 */
export async function GET(req: Request) {
  const cronKey = process.env.CRON_KEY;
  const key = new URL(req.url).searchParams.get("key");
  if (!cronKey || key !== cronKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return botPost(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tick" }),
    })
  );
}
