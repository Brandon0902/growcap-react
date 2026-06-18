# Growcap React

Frontend React/Vite de Growcap preparado para publicarse como sitio estatico.

## Tecnologias

- React con Vite
- JavaScript
- React Router DOM
- Axios
- GSAP
- pnpm

## Instalacion

```bash
pnpm install
pnpm run dev
```

## Configuracion de entorno

La API se configura con variables Vite:

```bash
VITE_BACKEND_URL=https://cajagrowcap.casabarrel.com
VITE_API_URL=https://cajagrowcap.casabarrel.com/api
VITE_APP_NAME=Growcap
```

`VITE_BACKEND_URL` se usa para `/sanctum/csrf-cookie`; `VITE_API_URL` se usa para los endpoints `/api/*`. Para produccion, el archivo `.env.production` ya apunta al backend real.

## Build de produccion

```bash
pnpm install --frozen-lockfile
pnpm run build
```

El build genera la carpeta `dist`. Para cPanel/Apache, sube el contenido de `dist` directamente a `public_html`.

## Rutas en Apache

El archivo `public/.htaccess` se copia a `dist` durante el build para soportar React Router en Apache.

## Modulos incluidos

- Autenticacion SPA con cookies HttpOnly de Laravel Sanctum.
- Dashboard financiero.
- Perfil conectado a `/cliente/mis-datos`.
- Ahorros con solicitud guiada, planes y Stripe Checkout.
- Inversiones con solicitud guiada, planes y Stripe Checkout.
- Prestamos con flujo guiado y aval por codigo o documentos.
- Modales para consultar registros existentes.
