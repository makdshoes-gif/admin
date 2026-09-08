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

export default app;
