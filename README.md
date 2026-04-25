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
- `SQLITE_PATH`: ruta de la base SQLite
- `TIKTOK_WS_URL`: WebSocket local de eventos
- `UPLOAD_DIR`: carpeta para stickers subidos
- `GOOGLE_APPLICATION_CREDENTIALS`: opcional; si esta vacio, el JSON de Google puede cargarse desde el dashboard

Las URLs publicas del overlay (`overlay.gilo.mx`) ya vienen definidas en el codigo para no pedirle esa configuracion al usuario final.

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

## Rutas

- Dashboard: `http://localhost:5173/`
- Overlay OBS: `http://localhost:5173/overlay`
- API: `http://localhost:3001/api`

## Overlay publico

El proyecto ya puede generar una identidad estable por instalacion y preparar una URL del tipo:

- `https://overlay.gilo.mx/<overlaySlug>`

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
- retransmitir eventos al overlay web en `overlay.gilo.mx/[slug]`
- invalidar una identidad anterior cuando el cliente pida una nueva URL

Con eso TikTok Live Studio solo carga la URL publica y el cliente local sigue siendo quien escucha TikTok/TTS/moderacion.

## Notas

- El dashboard ejecuta el bucle de reproduccion TTS y reclama el siguiente mensaje de la cola.
- El overlay esta pensado para usarse en OBS y tiene tamano recomendado de `500x300`.
- Los stickers subidos viven en `server/uploads/stickers`.
- El asset de preview del overlay vive en `client/src/assets/loco.gif`.
