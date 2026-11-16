import type { CapacitorConfig } from "@capacitor/cli";

/**
 * StepCash Android app.
 * The app loads your LIVE website (it needs the server for pools, payments, leaderboards)
 * and adds native phone/watch step tracking through Health Connect.
 *
 * IMPORTANT: set STEPCASH_URL to your permanent website address before building,
 * e.g. STEPCASH_URL=https://stepcash.vercel.app npx cap sync android
 */
const serverUrl = process.env.STEPCASH_URL || "https://stepcash.vercel.app";

const config: CapacitorConfig = {
  appId: "com.stepcash.app",
  appName: "StepCash",
  webDir: "mobile-www",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#0B0F0C",
  },
};

export default config;
