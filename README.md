# Gilo TikTok Chat Overlay

Aplicacion full-stack para leer, moderar y mostrar en overlay un chat de TikTok para stream.

## Stack

- API: Express + Socket.IO
- Frontend: React + Vite
- Persistencia: SQLite
- TTS: Google Cloud Text-to-Speech
- Fuente de eventos: `ws://localhost:21213/` (TikFinity u otra fuente compatible)
- Relay opcional para overlay publico: WebSocket saliente hacia tu dominio

## Que hace

- Recibe eventos del chat de TikTok por WebSocket local
- Filtra palabras prohibidas, reemplazos y caracteres raros
- Maneja una cola TTS con controles desde dashboard
- Permite stickers personalizados y emotes del evento
- Muestra overlay para OBS con personalizacion visual en tiempo real
- Guarda configuraciones, stickers, palabras, reemplazos y usuarios silenciados en SQLite
- Genera un `overlaySlug` estable por instalacion para poder apuntar a una URL publica fija

## Arranque rapido

1. Copia `.env.example` a `.env`
2. Instala dependencias:

```powershell
npm.cmd install
npm.cmd run install:all
```

3. Inicia el proyecto:

```powershell
npm.cmd run dev
```

## Configuracion

Variables principales en [C:/Users/mgtgi/dev/gilo-tiktok-chat/.env.example](C:/Users/mgtgi/dev/gilo-tiktok-chat/.env.example):

- `PORT`: puerto del backend
- `CLIENT_URL`: URL del frontend en desarrollo
- `TIKTOK_WS_URL`: WebSocket local de eventos
- `GOOGLE_APPLICATION_CREDENTIALS`: opcional; si esta vacio, el JSON de Google puede cargarse desde el dashboard

Las URLs publicas del overlay (`overlay.gilo.mx`) ya vienen definidas en el codigo para no pedirle esa configuracion al usuario final.
La carpeta de datos del usuario tambien se resuelve automaticamente y no necesita configuracion manual.

## Google TTS

La app ya no depende obligatoriamente de un `credentials.json` manual.

Puedes configurarlo de dos formas:

1. Subiendo el JSON de Google desde el panel del lector
2. Poniendo una ruta en `GOOGLE_APPLICATION_CREDENTIALS`

La credencial subida desde UI se guarda localmente y esta ignorada por Git.

## Persistencia

Se guarda en SQLite:

- palabras prohibidas
- frases reemplazables
- stickers
- usuarios silenciados
- configuracion del lector
- configuracion del overlay
- identidad de instalacion del overlay (`installationId`, `overlaySlug`, `relaySecret`)
- estado pausado de la cola

Se mantiene solo en memoria del backend:

- cola actual
- mensajes recientes del overlay
- usuarios recientes en live

## Datos del usuario

La app mantiene una carpeta estable para datos persistentes en:

- `server/data/app.db`
- `server/data/uploads/`
- `server/data/google-service-account.json`
- `server/data/backups/`

Cuando el esquema cambia, la app:

- detecta la version de la base
- crea un backup automatico antes de migrar
- aplica migraciones numeradas

Si encuentra uploads heredados en `server/uploads`, intenta copiarlos automaticamente a `server/data/uploads` para no perder stickers al actualizar.

## Como agregar una migracion nueva

Si en una actualizacion necesitas guardar una tabla, columna o indice nuevo en SQLite:

1. Abre [C:/Users/mgtgi/dev/gilo-tiktok-chat/server/src/config/db.js](C:/Users/mgtgi/dev/gilo-tiktok-chat/server/src/config/db.js)
2. Sube `LATEST_SCHEMA_VERSION` en `+1`
3. Agrega una nueva entrada al arreglo `migrations`
4. Escribe ahi el SQL o la logica necesaria dentro de `up()`
5. Arranca la app y verifica que:
   - se cree un backup en `server/data/backups/`
   - se aplique la migracion nueva
   - la app siga levantando normal

Ejemplo:

```js
{
  version: 6,
  name: "add soundboard presets",
  up() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS soundboard_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }
}
```

Reglas recomendadas:

- no edites migraciones viejas que ya pudieron correr en instalaciones reales
- agrega migraciones nuevas al final del arreglo
- usa defaults seguros para columnas nuevas
- si solo agregas una columna, puedes apoyarte en `ensureColumn(...)`
- si el cambio es delicado, prueba primero con una copia de `app.db`

## Rutas

- Dashboard: `http://localhost:5173/`
- Overlay OBS: `http://localhost:5173/overlay`
- API: `http://localhost:3001/api`

## Overlay publico

El proyecto ya puede generar una identidad estable por instalacion y preparar una URL del tipo:

- `https://overlay.gilo.mx/chat/<overlaySlug>`

La app local:

- pide la identidad a `OVERLAY_REGISTRATION_URL` solo si todavia no existe en SQLite
- puede invalidar la identidad anterior con `OVERLAY_REVOCATION_URL` al pedir una nueva URL
- guarda `overlaySlug` y `relaySecret` en SQLite una sola vez
- expone esa metadata en `/api/dashboard/summary` y `/api/dashboard/overlay-public`
- puede abrir un WebSocket saliente hacia `OVERLAY_RELAY_URL`
- envia `overlay.register`, `overlay.snapshot` y `overlay.event`

Respuesta esperada del endpoint de revocacion:

```json
{
  "ok": true
}
```

Respuesta esperada del endpoint de registro:

```json
{
  "installationId": "uuid-o-id-global",
  "overlaySlug": "slug-unico-estable",
  "relaySecret": "secreto-largo-y-unico"
}
```

Tu servidor Next.js o tu backend del dominio necesita:

- generar `overlaySlug` y `relaySecret` unicos del lado servidor
- aceptar la conexion del cliente local usando `overlaySlug` + `relaySecret`
- guardar el ultimo snapshot por `overlaySlug`
- retransmitir eventos al overlay web en `overlay.gilo.mx/chat/[slug]`
- invalidar una identidad anterior cuando el cliente pida una nueva URL

Con eso TikTok Live Studio solo carga la URL publica y el cliente local sigue siendo quien escucha TikTok/TTS/moderacion.

## Notas

- El dashboard ejecuta el bucle de reproduccion TTS y reclama el siguiente mensaje de la cola.
- El overlay esta pensado para usarse en OBS y tiene tamano recomendado de `500x300`.
- Los stickers nuevos viven en `server/data/uploads/stickers`.
- La app intenta rescatar uploads heredados desde `server/uploads/stickers` si existen.
- El asset de preview del overlay vive en `client/src/assets/loco.gif`.
