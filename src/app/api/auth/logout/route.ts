import { destroySession } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroySession();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
