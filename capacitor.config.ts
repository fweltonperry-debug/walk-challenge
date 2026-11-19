import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.walkchallenge.app",
  appName: "Walk Challenge",
  webDir: "www",
  server: {
    // The Android shell loads the hosted web app. Replace this with your
    // deployed URL (e.g. https://walkchallenge.vercel.app) before building.
    url: "https://walk-challenge-six.vercel.app",
    cleartext: false,
  },
};

export default config;
