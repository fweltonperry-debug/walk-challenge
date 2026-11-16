"use client";

/**
 * Phone/watch step tracking via Android Health Connect.
 * Only works inside the StepCash Android app (Capacitor). In a normal browser,
 * isNativeApp() returns false and the UI asks the user to install the app.
 */

export async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type HealthStatus = "not-native" | "not-installed" | "no-permission" | "ready";

export async function getHealthStatus(): Promise<HealthStatus> {
  if (!(await isNativeApp())) return "not-native";
  const { Health } = await import("capacitor-health");
  const { available } = await Health.isHealthAvailable();
  if (!available) return "not-installed";
  try {
    const res = await Health.checkHealthPermissions({ permissions: ["READ_STEPS"] });
    const granted = res.permissions?.some((p) => Object.values(p).some(Boolean));
    return granted ? "ready" : "no-permission";
  } catch {
    return "no-permission";
  }
}

export async function requestStepPermission(): Promise<boolean> {
  const { Health } = await import("capacitor-health");
  const res = await Health.requestHealthPermissions({ permissions: ["READ_STEPS"] });
  return !!res.permissions?.some((p) => Object.values(p).some(Boolean));
}

export async function openHealthConnectInstall() {
  const { Health } = await import("capacitor-health");
  await Health.showHealthConnectInPlayStore();
}

export async function openHealthConnectSettings() {
  const { Health } = await import("capacitor-health");
  await Health.openHealthConnectSettings();
}

export type StepReading = {
  totalSteps: number;
  manualSteps: number;
  days: { date: string; steps: number }[];
};

/** Reads steps between start and end from Health Connect (phone + watch, de-duplicated). */
export async function readSteps(start: Date, end: Date): Promise<StepReading> {
  const { Health } = await import("capacitor-health");
  if (end <= start) return { totalSteps: 0, manualSteps: 0, days: [] };

  const startDate = start.toISOString();
  const endDate = end.toISOString();

  // Aggregated totals: Health Connect merges phone + watch without double counting
  const { aggregatedData } = await Health.queryAggregated({
    startDate,
    endDate,
    dataType: "steps",
    bucket: "day",
  });
  const days = (aggregatedData || []).map((b) => ({
    date: b.startDate.slice(0, 10),
    steps: Math.round(b.value || 0),
  }));
  const totalSteps = days.reduce((s, d) => s + d.steps, 0);

  // Find hand-typed step records so the server can exclude them
  let manualSteps = 0;
  try {
    const { records } = await Health.queryRecords({ startDate, endDate, dataType: "steps" });
    manualSteps = Math.round(
      (records || []).filter((r) => r.manual).reduce((s, r) => s + (r.value || 0), 0)
    );
  } catch {
    // If raw records can't be read, fall back to aggregated only
  }

  return { totalSteps, manualSteps: Math.min(manualSteps, totalSteps), days };
}
