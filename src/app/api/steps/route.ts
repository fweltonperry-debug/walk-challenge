import { getCurrentUser } from "@/lib/auth";
import { errorResponse, HttpError, readJson } from "@/lib/http";
import { logSteps, utcDate } from "@/lib/rooms";
import { asPositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Log in first.");

    const body = await readJson(req);
    const entryId = asPositiveInt(body.entryId);
    if (!entryId) throw new HttpError(400, "Missing challenge entry.");

    const steps = typeof body.steps === "number" ? body.steps : Number(body.steps);
    if (!Number.isFinite(steps)) throw new HttpError(400, "Enter your step count.");

    const logDate = typeof body.date === "string" && body.date ? body.date : utcDate(new Date());

    const saved = await logSteps(user.id, entryId, logDate, Math.floor(steps));
    return Response.json({ log: { logDate: saved.logDate, steps: saved.steps } });
  } catch (error) {
    return errorResponse(error);
  }
}
