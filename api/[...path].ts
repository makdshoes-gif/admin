import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server/app.js';

// Express apps are plain (req, res) request handlers, so they can be reused
// directly as a Vercel Node.js serverless function. This one function
// (thanks to the [...path] catch-all filename) handles every /api/* route
// defined in server/app.ts, all backed by Neon Postgres — no local files,
// no in-memory state that would reset between invocations.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
