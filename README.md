# Walk Challenge

A step-competition app: players join 35-person rooms (daily / weekly / monthly / yearly),
pay an entry fee via Cash App, log steps, and the top 3 by steps split the prize pool
(60/30/10) after a 10% platform fee.

## Deploying (free)

1. Create a free Postgres database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `CASHAPP_CASHTAG`, `ADMIN_PASSWORD`, `CRON_SECRET`.
3. Push this project to GitHub.
4. Import the repo at [vercel.com](https://vercel.com) and add the same environment variables in the Vercel project settings.
5. Deploy. Your public URL is now live.

## Local development

```bash
npm install
cp .env.example .env   # then fill in values
npx drizzle-kit push   # create database tables
npm run dev
```

## Android app

The Android shell is in `android/` (Capacitor). Set `server.url` in `capacitor.config.ts`
to your deployed URL, then build with Android Studio. Step sync uses Health Connect
via `@capgo/capacitor-health`.
