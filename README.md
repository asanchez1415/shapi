# Shapi

Organiza el entrenamiento del día sobre el calendario. Next.js + Supabase, con el sistema de diseño Shapi.

## Empezar

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Las variables de Supabase van en `.env.local` (ejemplo en `.env.example`).

## Inicio de sesión con Google

Para que el botón funcione hay que activar Google en Supabase (una sola vez):

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea un ID de cliente OAuth de tipo "Aplicación web".
2. En "URI de redireccionamiento autorizados" pega la URL de callback que muestra Supabase en
   Authentication > Sign In / Providers > Google (termina en `/auth/v1/callback`).
3. Copia el ID de cliente y el secreto en esa misma pantalla de Supabase y activa Google.
4. En Authentication > URL Configuration, agrega `http://localhost:3000/**` en "Redirect URLs".

## Estructura

- `src/app/login`: página de inicio de sesión.
- `src/app/auth/callback`: recibe el código de Google y abre la sesión.
- `src/app/(app)/`: marco con menú (lateral en notebook, inferior en celular) y las pantallas: `hoy` (inicio de la app), `semana`, `sesion/[id]` (detalle) y `sesion/[id]/editar`. Las acciones (marcar estado, editar) están en `actions.ts`.
- `src/proxy.ts` y `src/lib/supabase/`: renovación de sesión y clientes de Supabase.
- `src/styles/tokens.css`: tokens del sistema de diseño, generados desde `tokens.json`.
- `src/styles/shapi.css`: estilos de los componentes del sistema de diseño.
- `src/components/`: componentes del sistema de diseño portados a TSX.
- `src/lib/`: fechas (`dates.ts`), tipos y consulta de la semana (`sessions.ts`).
- `src/lib/edit.ts`: convierte la estructura de una sesión a campos de formulario y la valida al guardar.
- `src/lib/rules.ts`: reglas del diseño (por ejemplo, Hecha solo desde el día de la sesión).
