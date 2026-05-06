# Growcap React

Frontend inicial en React para migrar la interfaz actual de Growcap desde Laravel Blade hacia una aplicacion moderna con Vite.

Esta primera version contiene solo la estructura base del proyecto. No incluye integracion real con APIs, reglas completas de negocio ni diseno visual avanzado.

## Tecnologias

- React con Vite
- JavaScript
- React Router DOM
- Axios
- CSS simple

## Instalacion

```bash
npm install
npm run dev
```

Vite mostrara la URL local para abrir el proyecto en el navegador.

## Configuracion de entorno

Copia `.env.example` a `.env` y ajusta las variables cuando exista la API correspondiente:

```bash
VITE_API_BASE_URL=
VITE_APP_NAME=Growcap
```

## Modulos incluidos

- Autenticacion: login temporal, token en `localStorage`, logout y ruta protegida.
- Dashboard: pantalla principal con accesos a ahorro, inversion y prestamos.
- Ahorro: pagina principal y estructura de formulario de solicitud.
- Inversion: pagina principal, tarjetas de planes y formulario de solicitud.
- Prestamos: pagina principal y flujo guiado separado en pasos.
- Perfil: pantalla base de informacion del usuario.
- Errores: pagina 404.

## Estructura

```text
src/
  api/
  components/
    common/
    layout/
  features/
    auth/
    dashboard/
    savings/
    investments/
    loans/
    profile/
  hooks/
  routes/
  styles/
  utils/
```

Los servicios en `features/*/services` tienen funciones placeholder y comentarios `TODO` para conectar despues con Axios y los endpoints declarados en `src/api/endpoints.js`.
