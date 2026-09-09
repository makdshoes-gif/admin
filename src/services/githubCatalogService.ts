/**
 * Servicio de sincronización entre el inventario de MAKD SHOP y el Catálogo Web en GitHub
 * Repositorio objetivo: https://github.com/makdshoes-gif/makd
 * Catálogo público en GitHub Pages: https://makdshoes-gif.github.io/makd/catalogo.html
 */

import { ShoeProduct } from '../types';

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  autoSync?: boolean;
}

export interface GroupedCatalogItem {
  key: string;
  nombre: string;
  marca: string;
  modelo: string;
  color: string;
  categoria: string;
  categoriaCode: string;
  precio: number;
  imagen: string;
  skuPrincipal: string;
  idPrincipal: string;
  tallas: string[];
  stockTotal: number;
  descripcion?: string;
  genero?: string;
}

export const DEFAULT_GITHUB_CONFIG: GitHubSyncConfig = {
  owner: 'makdshoes-gif',
  repo: 'makd',
  branch: 'main',
  token: '',
  autoSync: false,
};

const STORAGE_CONFIG_KEY = 'makd_github_sync_config';

/**
 * Cargar configuración guardada de GitHub
 */
export function getSavedGitHubConfig(): GitHubSyncConfig {
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_GITHUB_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Error reading github config from localStorage:', err);
  }
  return { ...DEFAULT_GITHUB_CONFIG };
}

/**
 * Guardar configuración de GitHub
 */
export function saveGitHubConfig(config: GitHubSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Error saving github config to localStorage:', err);
  }
}

/**
 * Clasificar categoría para los filtros de catalogo.html
 * ('futbol' | 'beisbol' | 'running' | 'casual' | 'otros')
 */
export function mapToCatalogCategory(p: ShoeProduct): { code: string; label: string; dotColor: string } {
  const text = `${p.categoria || ''} ${p.tipo || ''} ${p.nombre || ''} ${p.descripcion || ''}`.toLowerCase();

  if (text.includes('futbol') || text.includes('fútbol') || text.includes('tacos') || text.includes('guayos') || text.includes('goletto')) {
    return { code: 'futbol', label: 'Fútbol', dotColor: 'var(--dot-futbol)' };
  }
  if (text.includes('beisbol') || text.includes('béisbol') || text.includes('baseball') || text.includes('softbol')) {
    return { code: 'beisbol', label: 'Béisbol', dotColor: 'var(--dot-beisbol)' };
  }
  if (text.includes('running') || text.includes('correr') || text.includes('maraton') || text.includes('maratón') || text.includes('run')) {
    return { code: 'running', label: 'Running', dotColor: 'var(--dot-running)' };
  }
  if (text.includes('casual') || text.includes('sneaker') || text.includes('urbano') || text.includes('moda')) {
    return { code: 'casual', label: 'Casual', dotColor: 'var(--dot-casual)' };
  }
  if (text.includes('gorra')) {
    return { code: 'gorras', label: 'Gorras', dotColor: 'var(--dot-otros)' };
  }
  if (text.includes('media') || text.includes('calcetin')) {
    return { code: 'medias', label: 'Medias', dotColor: 'var(--dot-otros)' };
  }
  return { code: 'casual', label: 'Casual', dotColor: 'var(--dot-casual)' };
}

/**
 * Agrupar productos de inventario por modelo/color para mostrarlos ordenados
 * con sus tallas disponibles en el catálogo web
 */
export function groupProductsForCatalog(products: ShoeProduct[]): GroupedCatalogItem[] {
  const activeProducts = products.filter((p) => p.activo !== false && (Number(p.stock) > 0 || p.stock === undefined));

  const groups = new Map<string, GroupedCatalogItem>();

  for (const p of activeProducts) {
    const normBrand = (p.marca || 'MAKD').trim();
    const normName = (p.nombre || 'Calzado').trim();
    const normColor = (p.color || '').trim();
    const groupKey = `${normBrand}_${normName}_${normColor}`.toLowerCase().replace(/\s+/g, '_');

    const catInfo = mapToCatalogCategory(p);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        nombre: normName,
        marca: normBrand,
        modelo: normName,
        color: normColor,
        categoria: catInfo.label,
        categoriaCode: catInfo.code,
        precio: Number(p.precio) || 0,
        imagen: p.imagen || 'images/logo.png',
        skuPrincipal: p.sku || `MAKD-${Date.now()}`,
        idPrincipal: p.id,
        tallas: p.talla ? [p.talla.trim()] : [],
        stockTotal: Number(p.stock) || 0,
        descripcion: p.descripcion,
        genero: p.genero,
      });
    } else {
      const existing = groups.get(groupKey)!;
      if (p.talla && !existing.tallas.includes(p.talla.trim())) {
        existing.tallas.push(p.talla.trim());
      }
      existing.stockTotal += Number(p.stock) || 0;
      // Usar imagen si el grupo no tenía una definida
      if ((!existing.imagen || existing.imagen === 'images/logo.png') && p.imagen) {
        existing.imagen = p.imagen;
      }
      // Actualizar precio si es mayor o más reciente
      if (p.precio && p.precio > 0) {
        existing.precio = Number(p.precio);
      }
    }
  }

  // Ordenar tallas numéricamente dentro de cada grupo
  for (const group of groups.values()) {
    group.tallas.sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }

  return Array.from(groups.values());
}

/**
 * Generar catalogo.html optimizado para el repositorio https://github.com/makdshoes-gif/makd
 * Conserva fielmente la paleta, tipografía, Cashea SDK y botones de WhatsApp originales.
 */
export function generateCatalogHtml(
  products: ShoeProduct[],
  exchangeRate: number,
  options: {
    whatsappNumber?: string;
    casheaPublicKey?: string;
    apiOrigin?: string;
  } = {}
): string {
  const whatsappNumber = options.whatsappNumber || '584249307158';
  const casheaKey = options.casheaPublicKey || 'PUBLIC_API_KEY_PENDIENTE';
  const apiOrigin = options.apiOrigin || '';

  const grouped = groupProductsForCatalog(products);

  // Extraer categorías únicas para los botones de filtro
  const categoriesSet = new Set<string>(['todos']);
  grouped.forEach((g) => categoriesSet.add(g.categoriaCode));

  const filterButtons = [
    { code: 'todos', label: 'Todos' },
    { code: 'futbol', label: 'Fútbol' },
    { code: 'beisbol', label: 'Béisbol' },
    { code: 'running', label: 'Running' },
    { code: 'casual', label: 'Casual' },
  ];

  // Si hay otras categorías presentes en el inventario, agregarlas
  for (const catCode of categoriesSet) {
    if (!filterButtons.some((b) => b.code === catCode)) {
      filterButtons.push({
        code: catCode,
        label: catCode.charAt(0).toUpperCase() + catCode.slice(1),
      });
    }
  }

  // Render de tarjetas de productos
  const cardsHtml = grouped
    .map((item, index) => {
      const priceUSD = item.precio;
      const priceBs = Math.round(priceUSD * exchangeRate);
      const formattedUSD = priceUSD > 0 ? `$${priceUSD.toFixed(2)}` : 'Consultar precio';
      const formattedBs = priceUSD > 0 ? `(~${priceBs.toLocaleString('es-VE')} Bs)` : '';
      const tallasStr = item.tallas.length > 0 ? item.tallas.join(', ') : 'Consultar';
      const stockBadge =
        item.stockTotal > 0
          ? `${item.stockTotal} ${item.stockTotal === 1 ? 'par disponible' : 'pares disponibles'}`
          : 'Bajo pedido';

      const waText = encodeURIComponent(
        `Hola MAKD SHOP, me interesa el modelo *${item.nombre}* (${item.marca}) ${
          item.color ? `- Color ${item.color}` : ''
        }. Vi que está disponible en talla(s) ${tallasStr} a ${formattedUSD}. ¿Tienen disponibilidad inmediata?`
      );

      const catInfo = mapToCatalogCategory({
        categoria: item.categoria,
        tipo: 'Deportivo',
        nombre: item.nombre,
      } as any);

      // Limpiar comillas para atributos HTML
      const cleanNombre = item.nombre.replace(/"/g, '&quot;');
      const cleanSku = item.skuPrincipal.replace(/"/g, '&quot;');

      return `      <!-- PRODUCTO ${index + 1}: ${cleanNombre} -->
      <article class="card" data-cat="${item.categoriaCode}" data-id="${item.idPrincipal}">
        <div class="card-media">
          <span class="card-tag">
            <span class="dot" style="background:${catInfo.dotColor}"></span>
            <span>${item.categoria}</span>
          </span>
          <img id="main-p${index + 1}" src="${item.imagen}" alt="${cleanNombre}" loading="lazy" onerror="this.src='images/logo.png'">
        </div>
        <div class="card-body">
          <div class="card-brand">${item.marca}</div>
          <h3>${cleanNombre} ${item.color ? `— ${item.color}` : ''}</h3>
          <div class="card-precio">
            <span class="precio-usd">${formattedUSD}</span>
            ${formattedBs ? `<span class="precio-bs">${formattedBs}</span>` : ''}
          </div>
          <div class="card-tallas">
            <strong>Tallas:</strong> ${tallasStr}
            <span class="card-stock-tag">${stockBadge}</span>
          </div>
          <a class="card-cta" target="_blank" rel="noopener" href="https://wa.me/${whatsappNumber}?text=${waText}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36c1.38.72 2.94 1.13 4.62 1.13 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 17.87c-1.53 0-2.96-.42-4.19-1.15l-.3-.18-3.11.78.83-3.03-.2-.31a7.86 7.86 0 01-1.24-4.07c0-4.36 3.55-7.91 7.92-7.91 4.36 0 7.91 3.55 7.91 7.91 0 4.37-3.55 7.96-7.62 7.96z"/></svg>
            Pedir por WhatsApp
          </a>
          <div class="cashea-box" data-cashea data-producto-id="${item.idPrincipal}" data-nombre="${cleanNombre}" data-sku="${cleanSku}" data-precio="${priceUSD}" data-imagen="${item.imagen}">
            <div class="cashea-label">🟣 Paga en cuotas con Cashea</div>
            <div class="cashea-form">
              <input type="text" class="cashea-cedula" placeholder="Tu cédula (ej: V12345678)">
              <button class="cashea-generar" type="button">Generar pago con Cashea</button>
            </div>
            <div class="cashea-container"></div>
          </div>
        </div>
      </article>`;
    })
    .join('\n\n');

  const now = new Date();
  const fechaStr = `${now.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo Oficial — MAKD SHOP</title>
  <meta name="description" content="Catálogo de calzado deportivo en MAKD SHOP. Fútbol, béisbol, running y estilo casual en Puerto Ordaz, Venezuela.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{
      --negro:#111111;
      --blanco:#FFFFFF;
      --gris-tile:#F6F6F6;
      --gris-texto:#767676;
      --gris-borde:#E4E4E4;
      --whatsapp:#25D366;
      --dot-futbol:#2E6B3E;
      --dot-beisbol:#7C1F2E;
      --dot-running:#E0A526;
      --dot-casual:#4F46E5;
      --dot-otros:#64748B;
    }
    *{box-sizing:border-box; margin:0; padding:0;}
    body{ font-family:'Inter', Arial, sans-serif; color:var(--negro); background:var(--blanco); -webkit-font-smoothing:antialiased; }
    img{max-width:100%; display:block;}
    a{text-decoration:none; color:inherit;}
    button{font-family:inherit; cursor:pointer;}
    .wrap{ max-width:1280px; margin:0 auto; padding:0 32px; }
    .display{ font-family:'Archivo', Arial, sans-serif; font-weight:900; text-transform:uppercase; letter-spacing:-0.01em; }

    nav{ position:sticky; top:0; z-index:50; background:var(--blanco); border-bottom:1px solid var(--gris-borde); }
    .nav-inner{ display:flex; align-items:center; justify-content:space-between; padding:16px 32px; max-width:1280px; margin:0 auto; }
    .brand{ display:flex; align-items:center; gap:10px; }
    .brand img{ height:36px; width:36px; object-fit:contain; border-radius:6px; }
    .brand span{ font-family:'Archivo', sans-serif; font-weight:900; font-size:19px; text-transform:uppercase; letter-spacing:0.02em; }
    .nav-links{ display:flex; align-items:center; gap:32px; }
    .nav-links a{ font-size:14px; font-weight:600; color:var(--negro); transition:opacity .15s; }
    .nav-links a:hover{ opacity:0.75; }
    .nav-links a.activo{ border-bottom:2px solid var(--negro); padding-bottom:4px; }
    .nav-cta{ display:flex; align-items:center; gap:8px; background:var(--negro); color:#fff; font-weight:700; font-size:14px; padding:11px 22px; border-radius:3px; transition:background .15s; }
    .nav-cta:hover{ background:#262626; }
    .nav-cta svg{ width:16px; height:16px; color:var(--whatsapp); }

    .cat-header{ padding:54px 0 28px 0; }
    .cat-header h1{ font-size:clamp(38px,6vw,68px); line-height:0.95; }
    .cat-header p{ margin-top:14px; max-width:560px; font-size:15px; color:var(--gris-texto); line-height:1.5; }

    .live-status-bar{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:20px; padding:12px 18px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:4px; font-size:13px; color:#475569; }
    .live-dot{ display:inline-block; width:8px; height:8px; border-radius:50%; background:#10B981; margin-right:6px; animation:pulse 2s infinite; }
    @keyframes pulse { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.4; transform:scale(1.2); } }

    .filtros{ display:flex; gap:24px; flex-wrap:wrap; padding:20px 0; margin-bottom:8px; border-top:1px solid var(--gris-borde); border-bottom:1px solid var(--gris-borde); }
    .filtro-btn{ background:none; border:none; padding:6px 0; font-size:14px; font-weight:600; color:var(--gris-texto); border-bottom:2px solid transparent; transition:all .15s; }
    .filtro-btn.activo{ color:var(--negro); border-bottom-color:var(--negro); }
    .filtro-btn:hover{ color:var(--negro); }

    .productos{ padding:28px 0 90px 0; }
    .grid-productos{ display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:36px 28px; }
    .card{ display:flex; flex-direction:column; background:var(--blanco); border:1px solid var(--gris-borde); border-radius:4px; overflow:hidden; transition:transform .2s, box-shadow .2s; }
    .card:hover{ transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.06); }
    .card-media{ position:relative; background:var(--gris-tile); aspect-ratio:1/1; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .card-media img{ width:100%; height:100%; object-fit:contain; padding:22px; transition:transform .35s ease; }
    .card:hover .card-media img{ transform:scale(1.05); }
    .card-tag{ position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.92); padding:4px 8px; border-radius:3px; backdrop-blur:2px; }
    .card-tag .dot{ width:7px; height:7px; border-radius:50%; }
    .card-tag span{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--negro); }

    .card-body{ padding:16px 18px 20px 18px; display:flex; flex-direction:column; gap:8px; flex:1; }
    .card-brand{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--gris-texto); }
    .card-body h3{ font-size:15px; font-weight:700; line-height:1.35; color:var(--negro); }
    .card-precio{ display:flex; align-items:baseline; gap:8px; font-weight:800; font-size:18px; color:var(--negro); margin-top:2px; }
    .card-precio .precio-bs{ font-size:13px; font-weight:600; color:var(--gris-texto); }
    .card-tallas{ font-size:12.5px; color:#475569; line-height:1.4; display:flex; flex-direction:column; gap:2px; }
    .card-stock-tag{ display:inline-block; font-size:11px; font-weight:600; color:#059669; }

    .card-cta{ margin-top:10px; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--negro); color:#fff; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.04em; padding:12px 14px; border-radius:3px; transition:background .15s ease; }
    .card-cta:hover{ background:#2d3748; }
    .card-cta svg{ width:16px; height:16px; color:var(--whatsapp); }

    .cashea-box{ margin-top:8px; border:1px solid #E9D5FF; background:#FAF5FF; border-radius:4px; padding:12px; }
    .cashea-box .cashea-label{ display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#6B21A8; margin-bottom:8px; }
    .cashea-box input{ width:100%; font-family:inherit; font-size:13px; padding:8px 10px; border:1px solid #D8B4FE; border-radius:3px; margin-bottom:8px; background:#fff; }
    .cashea-box input:focus{ outline:none; border-color:#9333EA; }
    .cashea-generar{ width:100%; background:#7E22CE; color:#fff; font-weight:700; font-size:12.5px; text-transform:uppercase; letter-spacing:0.04em; padding:9px 12px; border:none; border-radius:3px; transition:background .15s; }
    .cashea-generar:hover{ background:#6B21A8; }
    .cashea-generar:disabled{ background:#C9C3E8; cursor:not-allowed; }
    .cashea-container{ min-height:0; }
    .cashea-nota{ font-size:11px; color:var(--gris-texto); margin-top:4px; }

    footer{ border-top:1px solid var(--gris-borde); padding:36px 0; text-align:center; background:#FAFAFA; }
    footer p{ font-size:13px; color:var(--gris-texto); }
    footer .footer-sub{ font-size:11px; color:#94A3B8; margin-top:6px; }

    @media (max-width:640px){
      .wrap{ padding:0 20px; }
      .nav-inner{ padding:14px 20px; }
      .nav-links{ display:none; }
      .filtros{ overflow-x:auto; flex-wrap:nowrap; gap:16px; }
      .grid-productos{ grid-template-columns:1fr; }
    }
  </style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <div class="brand">
      <img src="images/logo.png" alt="MAKD SHOP" onerror="this.style.display='none'">
      <span>MAKD SHOP</span>
    </div>
    <div class="nav-links">
      <a href="index.html">Inicio</a>
      <a href="catalogo.html" class="activo">Catálogo</a>
    </div>
    <a class="nav-cta" href="https://wa.me/${whatsappNumber}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36c1.38.72 2.94 1.13 4.62 1.13 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 17.87c-1.53 0-2.96-.42-4.19-1.15l-.3-.18-3.11.78.83-3.03-.2-.31a7.86 7.86 0 01-1.24-4.07c0-4.36 3.55-7.91 7.92-7.91 4.36 0 7.91 3.55 7.91 7.91 0 4.37-3.55 7.96-7.62 7.96z"/></svg>
      WhatsApp
    </a>
  </div>
</nav>

<div class="wrap">
  <header class="cat-header">
    <h1 class="display">Catálogo Oficial</h1>
    <p>Calzado 100% original en fútbol, béisbol, running y estilo deportivo urbano. Sincronizado en vivo con nuestra tienda física.</p>
    
    <div class="live-status-bar">
      <div>
        <span class="live-dot"></span>
        <strong>Inventario en Línea:</strong> ${grouped.length} modelos activos · Tasa BCV: <strong>${exchangeRate.toFixed(2)} Bs/$</strong>
      </div>
      <div>
        <span style="font-size:11.5px; color:#64748B;">Actualizado: ${fechaStr}</span>
      </div>
    </div>
  </header>

  <!-- Filtros por categoría -->
  <div class="filtros" id="filtros">
${filterButtons
  .map(
    (b, idx) =>
      `    <button class="filtro-btn ${idx === 0 ? 'activo' : ''}" data-filtro="${b.code}">${b.label}</button>`
  )
  .join('\n')}
  </div>

  <section class="productos">
    <div class="grid-productos" id="grid-productos">
${cardsHtml || '      <p style="padding:40px; text-align:center; color:#94A3B8; width:100%;">No hay modelos disponibles en este momento.</p>'}
    </div>
  </section>
</div>

<footer>
  <p>MAKD SHOP — Marcamos tu estilo · Puerto Ordaz, Bolívar, Venezuela</p>
  <p class="footer-sub">Ventas directas y envíos a todo el país · Pagos en USD, Bolívares y Cashea</p>
</footer>

<!-- Filtro interactivo de categorías -->
<script>
  const botones = document.querySelectorAll('.filtro-btn');
  const cards = document.querySelectorAll('.card');
  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      botones.forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      const filtro = btn.dataset.filtro;
      cards.forEach(card => {
        card.style.display = (filtro === 'todos' || card.dataset.cat === filtro) ? 'flex' : 'none';
      });
    });
  });
</script>

<!-- Integración Cashea (pago en cuotas) -->
<script src="https://cdn.jsdelivr.net/npm/cashea-web-checkout-sdk/dist/bundle.js"></script>
<script>
  const CASHEA_PUBLIC_API_KEY = "${casheaKey}";
  const CASHEA_REDIRECT_URL = window.location.origin + window.location.pathname.replace("catalogo.html", "cashea-gracias.html");

  function activoCashea() {
    return typeof CheckoutSDK !== "undefined" && CASHEA_PUBLIC_API_KEY && CASHEA_PUBLIC_API_KEY !== "PUBLIC_API_KEY_PENDIENTE";
  }

  document.querySelectorAll("[data-cashea]").forEach((box) => {
    const boton = box.querySelector(".cashea-generar");
    const cedulaInput = box.querySelector(".cashea-cedula");
    const contenedor = box.querySelector(".cashea-container");
    const precio = parseFloat(box.dataset.precio || "0");

    if (!precio || precio <= 10) {
      box.querySelector(".cashea-form").innerHTML = '<div class="cashea-nota">Cashea disponible consultando precio por WhatsApp.</div>';
      return;
    }

    boton.addEventListener("click", () => {
      const cedula = (cedulaInput.value || "").trim();
      if (!cedula) {
        cedulaInput.style.borderColor = "#7C1F2E";
        cedulaInput.placeholder = "Escribe tu cédula para continuar";
        return;
      }
      if (!activoCashea()) {
        contenedor.innerHTML = '<div class="cashea-nota">Cashea disponible en tienda física o coordinando por WhatsApp.</div>';
        return;
      }
      try {
        const sdk = new CheckoutSDK({ apiKey: CASHEA_PUBLIC_API_KEY });
        const payload = {
          identificationNumber: cedula,
          externalClientId: cedula,
          deliveryMethod: "IN_STORE",
          merchantName: "MAKD SHOP",
          redirectUrl: CASHEA_REDIRECT_URL,
          deliveryPrice: 0,
          orders: [
            {
              store: { id: 1, name: "MAKD SHOP", enabled: true },
              products: [
                {
                  id: box.dataset.productoId,
                  name: box.dataset.nombre,
                  sku: box.dataset.sku,
                  description: box.dataset.nombre,
                  imageUrl: box.dataset.imagen,
                  quantity: 1,
                  price: precio,
                  tax: 0,
                  discount: 0,
                },
              ],
            },
          ],
        };
        contenedor.innerHTML = "";
        sdk.createCheckoutButton({ payload, container: contenedor });
        boton.style.display = "none";
        cedulaInput.style.display = "none";
      } catch (err) {
        console.error("Error inicializando Cashea:", err);
        contenedor.innerHTML = '<div class="cashea-nota">Error conectando con Cashea. Por favor escríbenos por WhatsApp.</div>';
      }
    });
  });
</script>

</body>
</html>`;
}

/**
 * Generar JSON limpio de productos para almacenar en GitHub (products.json)
 */
export function generateProductsJson(products: ShoeProduct[], exchangeRate: number): string {
  const grouped = groupProductsForCatalog(products);
  const data = {
    tienda: 'MAKD SHOP',
    tasaBCV: exchangeRate,
    actualizado: new Date().toISOString(),
    totalModelos: grouped.length,
    productos: grouped.map((g) => ({
      id: g.idPrincipal,
      nombre: g.nombre,
      marca: g.marca,
      color: g.color,
      categoria: g.categoria,
      categoriaCode: g.categoriaCode,
      precioUSD: g.precio,
      precioBs: Math.round(g.precio * exchangeRate),
      tallas: g.tallas,
      stockTotal: g.stockTotal,
      imagen: g.imagen,
      sku: g.skuPrincipal,
      descripcion: g.descripcion,
    })),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Probar conexión con el repositorio de GitHub usando el token
 */
export async function testGitHubRepoAccess(config: GitHubSyncConfig): Promise<{
  ok: boolean;
  message: string;
  repoInfo?: any;
}> {
  const { owner, repo, token } = config;
  if (!token.trim()) {
    return { ok: false, message: 'Se requiere un Token Personal de Acceso (PAT) de GitHub con permiso "repo".' };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { ok: false, message: 'Token de GitHub inválido o expirado. Verifica tu Personal Access Token.' };
      }
      if (res.status === 404) {
        return { ok: false, message: `No se encontró el repositorio "${owner}/${repo}" o el token no tiene permisos de lectura.` };
      }
      return { ok: false, message: `Error de GitHub (${res.status}): ${res.statusText}` };
    }

    const data = await res.json();
    return {
      ok: true,
      message: `Conexión exitosa con ${data.full_name} (${data.default_branch})`,
      repoInfo: data,
    };
  } catch (err: any) {
    return { ok: false, message: `Error de red al conectar con GitHub: ${err?.message || err}` };
  }
}

/**
 * Codificar texto UTF-8 a Base64 de forma segura en el navegador sin límite de tamaño
 */
function utf8ToBase64(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, Math.min(i + chunkSize, len)))
      );
    }
    return window.btoa(binary);
  } catch {
    return window.btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(_match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  }
}

/**
 * Obtener el SHA canónico y actual de un archivo en GitHub.
 * Evita la caché HTTP del navegador y resuelve retrasos de réplica mediante la API de árboles Git.
 */
async function getAuthoritativeFileSha(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string | undefined> {
  const cleanBranch = branch.trim() || 'main';
  const cleanToken = token.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${cleanToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  };

  const timestamp = Date.now();

  // Intento 1: Consultar Contents API con parámetro de cache-busting
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(cleanBranch)}&_cb=${timestamp}`,
      {
        cache: 'no-store',
        headers,
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.sha === 'string') {
        return data.sha;
      }
    } else if (res.status === 404) {
      // El archivo no existe aún en el repositorio (nuevo)
      return undefined;
    }
  } catch (err) {
    console.warn(`[GitHubSync] Consulta directa de SHA para ${path}:`, err);
  }

  // Intento 2: Consultar la API de árboles Git (Git Trees API) en la rama objetivo
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(cleanBranch)}?recursive=1&_cb=${timestamp}`,
      {
        cache: 'no-store',
        headers,
      }
    );

    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData?.tree)) {
        const item = treeData.tree.find((t: any) => t.path === path);
        if (item && item.sha) {
          return item.sha;
        }
        return undefined;
      }
    }
  } catch (treeErr) {
    console.warn(`[GitHubSync] Consulta de Git Tree para ${path}:`, treeErr);
  }

  // Intento 3: Leer el último commit de la rama y su árbol canónico
  try {
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(cleanBranch)}?_cb=${timestamp}`,
      {
        cache: 'no-store',
        headers,
      }
    );
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      const treeSha = commitData?.commit?.tree?.sha;
      if (treeSha) {
        const directTreeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1&_cb=${timestamp}`,
          { cache: 'no-store', headers }
        );
        if (directTreeRes.ok) {
          const directTreeData = await directTreeRes.json();
          if (Array.isArray(directTreeData?.tree)) {
            const item = directTreeData.tree.find((t: any) => t.path === path);
            if (item && item.sha) {
              return item.sha;
            }
            return undefined;
          }
        }
      }
    }
  } catch (commitErr) {
    console.warn(`[GitHubSync] Consulta de Commit Tree para ${path}:`, commitErr);
  }

  return undefined;
}

/**
 * Realizar commit de un archivo en GitHub manejando automáticamente conflictos 409 (SHA desactualizado)
 */
async function putFileToGitHubWithRetry(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string,
  contentBase64: string,
  commitMessage: string,
  maxAttempts: number = 3,
  onProgress?: (msg: string) => void
): Promise<{ ok: boolean; data?: any; error?: string; status?: number }> {
  const cleanBranch = branch.trim() || 'main';
  const cleanToken = token.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${cleanToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  };

  let lastError = '';
  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && onProgress) {
      onProgress(`Resolviendo sincronización con GitHub (intento ${attempt}/${maxAttempts})...`);
    }

    // Obtener el SHA canónico más reciente de GitHub
    const currentSha = await getAuthoritativeFileSha(owner, repo, path, cleanBranch, cleanToken);

    const body: Record<string, any> = {
      message: commitMessage,
      content: contentBase64,
      branch: cleanBranch,
    };
    if (currentSha) {
      body.sha = currentSha;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        cache: 'no-store',
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }

      const errBody: any = await res.json().catch(() => ({}));
      lastStatus = res.status;
      lastError = errBody.message || res.statusText || 'Error desconocido de GitHub';

      // 409 Conflict: El SHA no coincide o la rama avanzó
      if (res.status === 409 && attempt < maxAttempts) {
        console.warn(
          `[GitHubSync] Conflicto 409 en ${path} ("${lastError}"). Reobteniendo SHA fresco y reintentando (intento ${attempt}/${maxAttempts})...`
        );
        if (onProgress) {
          onProgress(`Detectada actualización previa en ${path}. Obteniendo versión más reciente de GitHub...`);
        }
        // Espera con backoff progresivo para permitir la consistencia en GitHub
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return {
        ok: false,
        status: res.status,
        error: `Error al actualizar ${path} en GitHub (${res.status}): ${lastError}`,
      };
    } catch (netErr: any) {
      lastStatus = 0;
      lastError = netErr?.message || String(netErr);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return {
        ok: false,
        status: 0,
        error: `Error de red al conectar con GitHub para ${path}: ${lastError}`,
      };
    }
  }

  return {
    ok: false,
    status: lastStatus,
    error: `Error al actualizar ${path} en GitHub (${lastStatus}): ${lastError}`,
  };
}

/**
 * Sincronizar catálogo directamente a GitHub (crea/actualiza catalogo.html y products.json)
 */
export async function pushCatalogToGitHub(
  config: GitHubSyncConfig,
  products: ShoeProduct[],
  exchangeRate: number,
  onProgress?: (msg: string) => void
): Promise<{
  ok: boolean;
  message: string;
  commitUrl?: string;
  catalogUrl?: string;
  error?: string;
}> {
  const { owner, repo, branch, token } = config;
  if (!token.trim()) {
    return {
      ok: false,
      message: 'Falta configurar tu GitHub Personal Access Token.',
      error: 'token_missing',
    };
  }

  const cleanBranch = branch.trim() || 'main';
  const cleanOwner = owner.trim() || 'makdshoes-gif';
  const cleanRepo = repo.trim() || 'makd';

  try {
    if (onProgress) onProgress('Compilando catálogo HTML y datos...');
    const htmlContent = generateCatalogHtml(products, exchangeRate);
    const jsonContent = generateProductsJson(products, exchangeRate);

    const nowStr = new Date().toLocaleString('es-VE');
    const commitMsgHtml = `Actualizar catálogo web desde inventario MAKD SHOP (${products.length} modelos) - ${nowStr}`;

    // 1. Commit de catalogo.html con retry y resolución autoritativa de SHA
    if (onProgress) onProgress('Publicando catalogo.html en GitHub...');
    const base64Html = utf8ToBase64(htmlContent);
    const htmlResult = await putFileToGitHubWithRetry(
      cleanOwner,
      cleanRepo,
      'catalogo.html',
      cleanBranch,
      token,
      base64Html,
      commitMsgHtml,
      3,
      onProgress
    );

    if (!htmlResult.ok) {
      return {
        ok: false,
        message: htmlResult.error || 'Error al actualizar catalogo.html en GitHub.',
        error: htmlResult.error,
      };
    }

    const htmlCommitData = htmlResult.data;

    // 2. Commit de products.json con retry
    if (onProgress) onProgress('Actualizando datos JSON en products.json...');
    try {
      const base64Json = utf8ToBase64(jsonContent);
      await putFileToGitHubWithRetry(
        cleanOwner,
        cleanRepo,
        'products.json',
        cleanBranch,
        token,
        base64Json,
        `Actualizar datos JSON del catálogo MAKD SHOP - ${nowStr}`,
        3,
        onProgress
      );
    } catch (jsonErr) {
      console.warn('[GitHubSync] Advertencia no crítica actualizando products.json:', jsonErr);
    }

    const catalogUrl = `https://${cleanOwner}.github.io/${cleanRepo}/catalogo.html`;
    const commitUrl =
      htmlCommitData?.commit?.html_url ||
      `https://github.com/${cleanOwner}/${cleanRepo}/commits/${cleanBranch}`;

    return {
      ok: true,
      message: `¡Catálogo sincronizado exitosamente en GitHub! Los cambios están en proceso de publicación en GitHub Pages.`,
      commitUrl,
      catalogUrl,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Error inesperado durante la sincronización: ${err?.message || err}`,
      error: err?.message,
    };
  }
}
