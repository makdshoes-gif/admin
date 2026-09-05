import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/app.js';

// Express apps are plain (req, res) request handlers, so they can be reused
// directly as a Vercel Node.js serverless function. This single function
// handles every /api/* route defined in server/app.ts (routed here via the
// rewrite rule in vercel.json), all backed by Neon Postgres — no local
// files, no in-memory state that would reset between invocations.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
