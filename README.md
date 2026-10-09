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
3. Run the app:
   `npm run dev`


## V19 — Abonos Cashea y modalidad de 6 cuotas

- La importación Excel reduce el saldo pendiente de cada factura por el campo **Monto asignado** y guarda cada abono individual con su referencia, fecha y número de cuota.
- El historial de abonos se muestra en el comprobante de venta y se persiste en Neon mediante `cashea_abonos`.
- El POS permite registrar la modalidad Cashea de 3 o 6 cuotas y muestra el monto estimado por cuota.
