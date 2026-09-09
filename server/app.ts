import express from 'express';
import {
  getNeonSql,
  initDatabaseSchema,
  getDailyClosures,
  addDailyClosure,
  replaceDailyClosures,
  normalizeProducts,
  normalizeSales,
  normalizeExpenses,
  normalizeBankReconciliations,
} from './db.js';
import { analyzeShoeImage } from './shoeAi.js';

export const app = express();
// límite ampliado: las fotos del escáner de calzado llegan como base64 (~1-4mb)
app.use(express.json({ limit: '12mb' }));

// API: Escáner de calzado con IA (Gemini Vision)
const handleShoeAnalysis = async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, userHint } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    }
    const result = await analyzeShoeImage(imageBase64, userHint);
    res.json(result);
  } catch (error: any) {
    console.error('Error al analizar el zapato con Gemini:', error);
    res.status(500).json({
      error: error?.message || 'No se pudo analizar la imagen con IA.',
    });
  }
};
app.post('/api/ai/analyze-shoe', handleShoeAnalysis);
app.post('/api/analyze-shoe', handleShoeAnalysis);

// API Store State
app.get('/api/store/state', async (_req, res) => {
  const sql = getNeonSql();
  if (sql) {
    try {
      await initDatabaseSchema();
      const [products, sales, expenses, reconciliations, closures] = await Promise.all([
        sql`SELECT * FROM shoe_products ORDER BY nombre ASC`,
        sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`,
        sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`,
        sql`SELECT * FROM bank_reconciliations ORDER BY fecha DESC, created_at DESC`,
        sql`SELECT * FROM cash_closures ORDER BY fecha DESC, created_at DESC`,
      ]);

      return res.json({
        success: true,
        source: 'neon_postgres',
        data: {
          products: normalizeProducts(products as any[]),
          sales: normalizeSales(sales as any[]),
          movements: [],
          cashClosures: closures,
          expenses: normalizeExpenses(expenses as any[]),
          accounts: [],
          bankMovements: normalizeBankReconciliations(reconciliations as any[]),
        },
      });
    } catch (err) {
      console.error('Error al sincronizar estado de Neon:', err);
    }
  }

  res.json({
    success: true,
    source: 'local_fallback',
    data: {
      products: [],
      sales: [],
      movements: [],
      cashClosures: [],
      expenses: [],
      accounts: [],
    },
  });
});

// Products
app.get('/api/products', async (_req, res) => {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM shoe_products ORDER BY nombre ASC`;
      return res.json({ source: 'neon_postgres', data: normalizeProducts(rows as any[]) });
    } catch (err) {
      console.error('Neon products fetch error:', err);
    }
  }
  res.json({ source: 'local_fallback', data: [] });
});

// Guardar (crear o actualizar) un producto individual
app.post('/api/products', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) {
    return res.status(400).json({ saved: false, error: 'Datos de producto inválidos' });
  }

  const sql = getNeonSql();
  if (!sql) {
    return res.status(503).json({
      saved: false,
      error: 'DATABASE_URL no configurada en Vercel: no se puede persistir el producto.',
    });
  }

  try {
    await initDatabaseSchema();
    await sql`
      INSERT INTO shoe_products (
        id, nombre, marca, modelo, color, genero, categoria,
        talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
        imagen_url, ubicacion, descripcion
      ) VALUES (
        ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
        ${p.genero || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
        ${p.precio}, ${p.costo}, ${p.stock}, ${p.stock_minimo || 3}, ${p.stock_maximo || 30},
        ${p.imagen_url || p.imagen || null}, ${p.ubicacion || 'Almacén'}, ${p.descripcion || ''}
      )
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        marca = EXCLUDED.marca,
        modelo = EXCLUDED.modelo,
        color = EXCLUDED.color,
        genero = EXCLUDED.genero,
        categoria = EXCLUDED.categoria,
        talla = EXCLUDED.talla,
        sku = EXCLUDED.sku,
        precio = EXCLUDED.precio,
        costo = EXCLUDED.costo,
        stock = EXCLUDED.stock,
        stock_minimo = EXCLUDED.stock_minimo,
        stock_maximo = EXCLUDED.stock_maximo,
        imagen_url = EXCLUDED.imagen_url,
        ubicacion = EXCLUDED.ubicacion,
        descripcion = EXCLUDED.descripcion;
    `;
    res.json({ saved: true, id: p.id, product: p });
  } catch (err) {
    console.error('Error guardando producto en Neon:', err);
    res.status(500).json({ saved: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const sql = getNeonSql();
  if (!sql) {
    return res.status(503).json({ success: false, error: 'DATABASE_URL no configurada en Vercel.' });
  }
  try {
    await sql`DELETE FROM shoe_products WHERE id = ${id}`;
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error eliminando producto en Neon:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Importación / carga masiva de productos (Excel, o crear modelo multi-talla)
app.post('/api/products/bulk', async (req, res) => {
  const { products, replaceExisting } = req.body || {};
  if (!Array.isArray(products)) {
    return res.status(400).json({ success: false, error: 'Se esperaba un arreglo de productos' });
  }

  const sql = getNeonSql();
  if (!sql) {
    return res.status(503).json({ success: false, error: 'DATABASE_URL no configurada en Vercel.' });
  }

  try {
    await initDatabaseSchema();
    if (replaceExisting) {
      await sql`DELETE FROM shoe_products`;
    }
    for (const p of products) {
      await sql`
        INSERT INTO shoe_products (
          id, nombre, marca, modelo, color, genero, categoria,
          talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
          imagen_url, ubicacion, descripcion
        ) VALUES (
          ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
          ${p.genero || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
          ${p.precio}, ${p.costo}, ${p.stock}, ${p.stock_minimo || 3}, ${p.stock_maximo || 30},
          ${p.imagen_url || p.imagen || null}, ${p.ubicacion || 'Almacén'}, ${p.descripcion || ''}
        )
        ON CONFLICT (id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          marca = EXCLUDED.marca,
          modelo = EXCLUDED.modelo,
          color = EXCLUDED.color,
          genero = EXCLUDED.genero,
          categoria = EXCLUDED.categoria,
          talla = EXCLUDED.talla,
          sku = EXCLUDED.sku,
          precio = EXCLUDED.precio,
          costo = EXCLUDED.costo,
          stock = EXCLUDED.stock,
          stock_minimo = EXCLUDED.stock_minimo,
          stock_maximo = EXCLUDED.stock_maximo,
          imagen_url = EXCLUDED.imagen_url,
          ubicacion = EXCLUDED.ubicacion,
          descripcion = EXCLUDED.descripcion;
      `;
    }
    res.json({ success: true, count: products.length });
  } catch (err) {
    console.error('Error en importación masiva a Neon:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Sales
app.get('/api/sales', async (_req, res) => {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`;
      return res.json({ source: 'neon_postgres', data: normalizeSales(rows as any[]) });
    } catch (err) {
      console.error('Neon sales fetch error:', err);
    }
  }
  res.json({ source: 'local_fallback', data: [] });
});

// Expenses
app.get('/api/expenses', async (_req, res) => {
  const sql = getNeonSql();
  if (!sql) {
    return res.json({ source: 'local_fallback', data: [] });
  }
  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`;
    res.json({ source: 'neon_postgres', data: normalizeExpenses(rows as any[]) });
  } catch (err) {
    console.error('Error al obtener gastos de Neon:', err);
    res.json({ source: 'local_fallback', error: String(err), data: [] });
  }
});

// Bank Reconciliations
app.get('/api/bank-reconciliations', async (_req, res) => {
  const sql = getNeonSql();
  if (!sql) {
    return res.json({ source: 'local_fallback', data: [] });
  }
  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT * FROM bank_reconciliations ORDER BY fecha DESC, created_at DESC`;
    res.json({ source: 'neon_postgres', data: normalizeBankReconciliations(rows as any[]) });
  } catch (err) {
    res.json({ source: 'local_fallback', error: String(err), data: [] });
  }
});

// ==========================================
// CATÁLOGO PÚBLICO & SINCRONIZACIÓN CON GITHUB
// ==========================================

// Endpoint público con CORS abierto para que el catálogo web (catalogo.html) pueda consultar stock en vivo
app.get('/api/catalog/products', async (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`SELECT * FROM shoe_products WHERE stock > 0 ORDER BY nombre ASC`;
      const products = normalizeProducts(rows as any[]);
      return res.json({
        success: true,
        count: products.length,
        actualizado: new Date().toISOString(),
        products,
      });
    } catch (err) {
      console.error('Error obteniendo productos para catálogo público:', err);
    }
  }
  res.json({ success: true, count: 0, products: [] });
});

// Endpoint para sincronizar / hacer commit directamente al repositorio de GitHub
app.post('/api/catalog/sync-github', async (req, res) => {
  try {
    const {
      token,
      owner = 'makdshoes-gif',
      repo = 'makd',
      branch = 'main',
      htmlContent,
      jsonContent,
      commitMessage,
    } = req.body || {};

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un Token Personal de Acceso (PAT) de GitHub con permisos de escritura.',
      });
    }

    if (!htmlContent || typeof htmlContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'No se recibió el contenido HTML del catálogo a sincronizar.',
      });
    }

    const cleanToken = token.trim();
    const targetOwner = owner.trim() || 'makdshoes-gif';
    const targetRepo = repo.trim() || 'makd';
    const targetBranch = branch.trim() || 'main';

    const githubHeaders: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cleanToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'MAKD-SHOP-App',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    };

    // Función auxiliar para obtener el SHA canónico de un archivo en GitHub
    const getAuthoritativeSha = async (filePath: string): Promise<string | undefined> => {
      const timestamp = Date.now();
      try {
        const shaRes = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${encodeURIComponent(targetBranch)}&_cb=${timestamp}`,
          { headers: githubHeaders }
        );
        if (shaRes.ok) {
          const shaData: any = await shaRes.json();
          if (shaData && typeof shaData.sha === 'string') return shaData.sha;
        } else if (shaRes.status === 404) {
          return undefined;
        }
      } catch (e) {
        console.warn(`[ServerAppGitHub] Error en consulta de SHA para ${filePath}:`, e);
      }

      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1&_cb=${timestamp}`,
          { headers: githubHeaders }
        );
        if (treeRes.ok) {
          const treeData: any = await treeRes.json();
          if (Array.isArray(treeData?.tree)) {
            const item = treeData.tree.find((t: any) => t.path === filePath);
            if (item && item.sha) return item.sha;
            return undefined;
          }
        }
      } catch (e) {
        console.warn(`[ServerAppGitHub] Error en Git Tree para ${filePath}:`, e);
      }

      return undefined;
    };

    // Función auxiliar para enviar commit con reintento ante conflictos 409
    const putFileWithRetry = async (
      filePath: string,
      base64Content: string,
      msg: string,
      maxRetries = 3
    ): Promise<{ ok: boolean; data?: any; status: number; error?: string }> => {
      let lastErr = '';
      let lastStat = 0;

      for (let i = 1; i <= maxRetries; i++) {
        const currentSha = await getAuthoritativeSha(filePath);
        const putBody: Record<string, any> = {
          message: msg,
          content: base64Content,
          branch: targetBranch,
        };
        if (currentSha) {
          putBody.sha = currentSha;
        }

        try {
          const putRes = await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: githubHeaders,
              body: JSON.stringify(putBody),
            }
          );

          if (putRes.ok) {
            const data = await putRes.json();
            return { ok: true, data, status: putRes.status };
          }

          const errBody: any = await putRes.json().catch(() => ({}));
          lastStat = putRes.status;
          lastErr = errBody.message || putRes.statusText || 'Error desconocido';

          if (putRes.status === 409 && i < maxRetries) {
            console.warn(
              `[ServerAppGitHub] Conflicto 409 en ${filePath}. Reintentando con SHA fresco (intento ${i}/${maxRetries})...`
            );
            await new Promise((r) => setTimeout(r, 1000 * i));
            continue;
          }

          return { ok: false, status: putRes.status, error: lastErr };
        } catch (netErr: any) {
          lastStat = 0;
          lastErr = netErr?.message || String(netErr);
          if (i < maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * i));
            continue;
          }
          return { ok: false, status: 0, error: lastErr };
        }
      }

      return { ok: false, status: lastStat, error: lastErr };
    };

    // 1. Commit de catalogo.html
    const nowStr = new Date().toLocaleString('es-VE');
    const msg = commitMessage || `Actualizar catálogo oficial desde MAKD SHOP - ${nowStr}`;
    const base64Html = Buffer.from(htmlContent, 'utf-8').toString('base64');

    const htmlCommitResult = await putFileWithRetry('catalogo.html', base64Html, msg, 3);

    if (!htmlCommitResult.ok) {
      return res.status(htmlCommitResult.status || 500).json({
        success: false,
        error: `Error de GitHub (${htmlCommitResult.status}): ${htmlCommitResult.error}`,
      });
    }

    const putData = htmlCommitResult.data;

    // 2. Commit opcional de products.json si fue enviado
    if (jsonContent && typeof jsonContent === 'string') {
      try {
        const base64Json = Buffer.from(jsonContent, 'utf-8').toString('base64');
        await putFileWithRetry(
          'products.json',
          base64Json,
          `Actualizar datos JSON del catálogo MAKD SHOP - ${nowStr}`,
          3
        );
      } catch (jsonErr) {
        console.warn('Error no crítico actualizando products.json en GitHub:', jsonErr);
      }
    }

    const commitUrl =
      putData?.commit?.html_url ||
      `https://github.com/${targetOwner}/${targetRepo}/commits/${targetBranch}`;
    const catalogUrl = `https://${targetOwner}.github.io/${targetRepo}/catalogo.html`;

    return res.json({
      success: true,
      message: 'Catálogo sincronizado exitosamente en GitHub.',
      commitUrl,
      catalogUrl,
      sha: putData?.content?.sha,
    });
  } catch (err: any) {
    console.error('Error sincronizando con GitHub en el backend:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error interno del servidor al sincronizar con GitHub.',
    });
  }
});

export default app;
