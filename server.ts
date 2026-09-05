import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.js';

// Local dev / traditional-node entrypoint. All the actual route logic lives in
// server/app.ts (shared with the Vercel serverless function in api/[...path].ts)
// so behavior is identical between `npm run dev`, `npm start`, and Vercel.
async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MAKD SHOP Server (dev) iniciado en http://0.0.0.0:${PORT}`);
    console.log('   Nota: en Vercel, estas mismas rutas corren desde api/[...path].ts');
  });
}

startServer();
