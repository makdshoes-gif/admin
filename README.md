<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b2dcdad4-bbbf-478e-8488-699c98059512

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set `DATABASE_URL` in `.env.local` to your Neon Postgres connection string (see `.env.example`). This is required — there is no local-file fallback, so without it the API returns a clear 503 instead of silently storing data that would be lost.
4. Run the app:
   `npm run dev`

## Deploying to Vercel

This project ships with real Vercel Serverless Functions (`api/[...path].ts`) that reuse the same Express routes as local dev (`server/app.ts`), so behavior is identical in both places. All persistent data (products, sales, stock movements, expenses, cash closures, accounts, settings) lives in Neon Postgres — nothing is written to the local filesystem, since that storage doesn't survive between serverless invocations or across devices.

Steps:
1. Push this repo to GitHub and import it in Vercel.
2. In your Vercel project → **Settings → Environment Variables**, add `DATABASE_URL` (and any `BDV_*` variables you use) for the **Production**, **Preview**, and **Development** environments.
3. Redeploy. You can confirm it's wired up correctly by opening `https://<your-app>.vercel.app/api/db/status` — it should report `"connected": true`.

If `DATABASE_URL` is missing, every data endpoint now returns `503` with a message telling you to configure it, instead of quietly appearing to save data.
