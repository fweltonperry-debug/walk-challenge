export const dynamic = "force-dynamic";

// Manual step entry is disabled. Steps sync automatically from the phone/watch
// through the StepCash Android app (see /api/steps/sync).
export async function POST() {
  return Response.json(
    { error: "Typing in steps is turned off. Steps sync automatically from your phone or watch in the StepCash Android app." },
    { status: 403 }
  );
}
