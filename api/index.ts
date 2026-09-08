import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../server/app.js';

// Express apps son simples manejadores (req, res), así que se pueden usar
// directamente como una función serverless de Vercel. Esta única función
// atiende TODAS las rutas /api/* definidas en server/app.ts (enrutadas aquí
// por la regla de rewrite en vercel.json), respaldadas por Neon Postgres.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
