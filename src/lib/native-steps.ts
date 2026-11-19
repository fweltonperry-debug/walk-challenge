import { Capacitor } from "@capacitor/core";

/**
 * Reads a day's step total from the phone/watch health store.
 * Android: Health Connect. iOS: HealthKit. Only works inside the native
 * app shell (Capacitor); on the web it throws.
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function syncStepsFromPhone(dateStr: string): Promise<number> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Step sync is only available in the Walk Challenge app.");
  }

  // Dynamic import so the web build never touches native code.
  const { Health } = await import("@capgo/capacitor-health");

  const availability = await Health.isAvailable();
  if (!availability.available) {
    throw new Error(
      "Health data is not available on this device. On Android 13 or older, install Health Connect from the Play Store.",
    );
  }

  const status = await Health.requestAuthorization({
    read: ["steps"],
    write: [],
    // Lets the app read steps older than 30 days (needed for monthly/yearly challenges).
    requestHistoryAccess: true,
  });

  if (!status.readAuthorized.includes("steps")) {
    throw new Error("Step access was denied. Allow step access in Health Connect to sync automatically.");
  }

  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  // Aggregated query: Health Connect merges phone + watch data without double counting.
  const { samples } = await Health.queryAggregated({
    dataType: "steps",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    bucket: "day",
    aggregation: "sum",
  });

  const total = samples.reduce((sum, s) => sum + (s.value ?? 0), 0);
  return Math.round(total);
}
