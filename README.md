# Gilo TikTok Chat Overlay

Aplicacion full-stack para leer, moderar y mostrar en overlay un chat de TikTok para stream.

## Stack

- API: Express + Socket.IO
- Frontend: React + Vite
- Persistencia: SQLite
- TTS: Google Cloud Text-to-Speech
- Fuente de eventos: `ws://localhost:21213/` (TikFinity u otra fuente compatible)

## Que hace

- Recibe eventos del chat de TikTok por WebSocket local
- Filtra palabras prohibidas, reemplazos y caracteres raros
- Maneja una cola TTS con controles desde dashboard
- Permite stickers personalizados y emotes del evento
- Muestra overlay para OBS con personalizacion visual en tiempo real
- Guarda configuraciones, stickers, palabras, reemplazos y usuarios silenciados en SQLite

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
- estado pausado de la cola

Se mantiene solo en memoria del backend:

- cola actual
- mensajes recientes del overlay
- usuarios recientes en live

## Rutas

- Dashboard: `http://localhost:5173/`
- Overlay OBS: `http://localhost:5173/overlay`
- API: `http://localhost:3001/api`

## Notas

- El dashboard ejecuta el bucle de reproduccion TTS y reclama el siguiente mensaje de la cola.
- El overlay esta pensado para usarse en OBS y tiene tamano recomendado de `500x300`.
- Los stickers subidos viven en `server/uploads/stickers`.
- El asset de preview del overlay vive en `client/src/assets/loco.gif`.
