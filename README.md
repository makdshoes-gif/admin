# MAKD SHOP — Panel de administrador

Dashboard financiero privado, separado de la tienda pública. Login de administrador + base de datos real (Neon/Postgres) + espacio listo para conciliación automática con Banco de Venezuela.

## ⚠️ Antes de empezar — reglas de seguridad

1. Este proyecto va en un **repositorio de GitHub PRIVADO**, distinto del repo público de la tienda (`makd`).
2. **Nunca** subas el archivo `.env.local` a GitHub (ya está en `.gitignore`, pero revísalo).
3. La clave del banco (`BDV_API_KEY`) y la contraseña de administrador **solo se pegan en Vercel**, nunca en el código ni en un chat.

## Paso 1 — Crear la base de datos en Neon

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta gratis
2. Crea un proyecto nuevo
3. Ve al **"SQL Editor"** dentro del proyecto y pega todo el contenido de `schema.sql` (está en esta carpeta) → Ejecutar
4. Ve a **"Connection Details"** y copia la cadena que empieza con `postgresql://...` — la vas a necesitar en el Paso 3

## Paso 2 — Generar tu contraseña de administrador

En tu computadora, dentro de esta carpeta:

```bash
npm install
node scripts/generar-hash.js "TuContraseñaSegura123"
```

Copia el resultado (un texto largo que empieza con `$2a$...`) — es tu contraseña ya encriptada, la vas a pegar en Vercel.

## Paso 3 — Crear el repositorio PRIVADO en GitHub

1. En GitHub → **"New repository"**
2. Nómbralo, por ejemplo `makd-admin`
3. Márcalo como **Private** (importante — a diferencia del repo de la tienda)
4. Sube todo el contenido de esta carpeta (arrastra los archivos, igual que hiciste con la tienda)

## Paso 4 — Conectar a Vercel

1. En Vercel → **"Add New" → "Project"**
2. Importa el repositorio `makd-admin`
3. **Antes de darle "Deploy"**, ve a **"Environment Variables"** y agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La cadena que copiaste de Neon en el Paso 1 |
| `ADMIN_PASSWORD_HASH` | El hash que generaste en el Paso 2 |
| `SESSION_SECRET` | Cualquier texto largo y aleatorio (genera uno en https://generate-secret.vercel.app/32) |
| `BDV_API_KEY` | Tu clave real del banco (solo aquí, nunca en el código) |
| `BDV_API_BASE_URL` | La URL base que te indique el manual técnico del banco |

4. Dale **"Deploy"**

## Paso 5 — Ajustar la integración del banco

El archivo `lib/bdv.js` tiene la conexión a la API del Banco de Venezuela ya estructurada de forma segura, pero con **marcadores 🔧** donde debes confirmar contra el manual técnico real que te dio el banco:
- La ruta exacta del endpoint
- El nombre del header de autenticación
- El formato exacto de los campos que devuelve

Sin ese ajuste, el botón "Sincronizar ahora" del dashboard te va a mostrar un error claro explicando qué falta — no va a inventar datos ni fallar en silencio.

## Paso 6 — Activar Cashea (pago en cuotas)

Cashea funciona así en esta tienda: el cliente reserva su pedido desde `catalogo.html` (le pide la cédula y lo manda a Cashea), y paga la inicial **físicamente en la tienda** (efectivo o pago móvil). Cuando la recibas, confirmas el pago en el panel de administración — eso avisa a Cashea y registra la venta automáticamente en tus finanzas.

1. Corre `migracion-cashea.sql` en el SQL Editor de Neon (no borra nada, solo agrega una columna).
2. En Vercel → Settings → Environment Variables, agrega `CASHEA_PRIVATE_API_KEY` con la clave **privada** que te dé Cashea. **Nunca** la pongas en `landing/catalogo.html` — esa es solo para el backend.
3. En `landing/catalogo.html`, busca la constante `CASHEA_PUBLIC_API_KEY` (cerca del final del archivo) y reemplázala por tu clave **pública** real.
4. En cada tarjeta de producto de `catalogo.html`, cambia `data-precio="0"` por el precio real — mientras esté en 0, el botón de Cashea se queda desactivado automáticamente para no generar pagos con precio incorrecto.
5. Revisa `cashea-gracias.html` y cambia el número de WhatsApp (`58XXXXXXXXXX`) por el real de la tienda.

Desde el dashboard, en la tarjeta "🟣 Pedidos Cashea" puedes:
- **Confirmar pago inicial**: escribe el número de orden que te dé el cliente + cuánto recibiste, y en qué cuenta — se registra como venta automáticamente.
- **Cancelar orden**: si el cliente nunca llega a pagar la inicial.

## Paso 8 — Usuario de cajera + facturación SENIAT

Ahora hay dos formas de entrar, con la misma pantalla de login pero distinta contraseña:
- **Administrador**: ve todo (finanzas, productos, cambio de divisa, Cashea, banco, historial).
- **Cajera**: solo ve "Ventas / Facturar" y "Pago móvil" — arma la venta, la factura, y verifica pagos móviles. No ve el historial financiero ni puede editar productos ni cuentas.

1. Genera la contraseña de la cajera igual que la del admin: `node scripts/generar-hash.js "suContraseña"`, y pega el resultado en Vercel como `CAJERA_PASSWORD_HASH`.
2. Corre `migracion-facturacion.sql` en Neon (crea la tabla `facturas`, no borra nada).
3. Para que la facturación SENIAT funcione de verdad, necesitas contratar un **proveedor de facturación electrónica certificado** (ej. Digital HKA, Unidigital, u otro que trabaje en Venezuela) y configurar en Vercel: `SENIAT_API_BASE_URL`, `SENIAT_API_TOKEN`, `SENIAT_RIF_EMISOR`, `SENIAT_RAZON_SOCIAL`, `SENIAT_DIRECCION_EMISOR`. El archivo `lib/seniat.js` tiene marcadores 🔧 donde debes confirmar el formato exacto contra la documentación real de tu proveedor (el nombre del header de autenticación y algunos códigos pueden variar). Sin esto configurado, el botón "Emitir factura SENIAT" te muestra un error claro explicando qué falta.
4. Para enviar la factura por correo, crea una cuenta gratis en [resend.com](https://resend.com) y configura `RESEND_API_KEY` (y opcionalmente `RESEND_FROM` con tu dominio verificado).
5. Para WhatsApp: como el click-to-chat de WhatsApp no permite adjuntar archivos automáticamente por link, el botón abre el chat con el mensaje y el link de descarga listos — la cajera descarga el PDF y lo adjunta manualmente en el chat (toma unos segundos).

## Uso diario

- Entra a `tu-proyecto.vercel.app/admin/login`
- Escribe tu contraseña
- Registra movimientos manualmente, o dale a "Sincronizar ahora" para traer los del banco automáticamente
- El diagnóstico de utilidad se calcula solo con cada movimiento que agregues

## Paso 7 — Productos, inventario y ventas por producto

Nuevo desde esta versión: puedes cargar tus productos (con precio y stock) y registrar cada venta seleccionándolos de un carrito — el sistema descuenta el stock automáticamente y registra el ingreso en tus finanzas, en la cuenta y moneda que elijas.

1. Corre `migracion-productos-ventas.sql` en el SQL Editor de Neon (no borra nada, solo crea 3 tablas nuevas: `productos`, `ventas`, `venta_items`).
2. En "Productos e inventario" carga cada producto con su precio y stock inicial. Si le pones un "alertar cuando el stock baje de", el dashboard te avisa arriba cuando llegue a ese número.
3. En "Registrar venta" arma el carrito (elige producto, cantidad, "Agregar"), y al confirmar se descuenta el stock y se registra como ingreso.
4. "Desactivar" un producto lo oculta de la lista y del punto de venta sin borrar su historial de ventas pasadas.
