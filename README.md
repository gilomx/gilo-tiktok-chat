# Gilo TikTok Chat Overlay

Aplicacion full-stack para moderar, reproducir con TTS y mostrar en overlay de OBS un chat de TikTok.

## Stack

- API: Express + MongoDB + Socket.IO
- Frontend: React + Vite
- TTS: Google Cloud Text-to-Speech
- Fuente de eventos: `ws://localhost:21213/`

## Arranque rapido

1. Copia `.env.example` a `.env` y completa las credenciales.
2. Instala dependencias:

```powershell
npm.cmd install
npm.cmd run install:all
```

3. Levanta MongoDB.
4. Inicia el proyecto:

```powershell
npm.cmd run dev
```

## Rutas

- Dashboard: `http://localhost:5173/`
- Overlay OBS: `http://localhost:5173/overlay`
- API: `http://localhost:3001/api`

## Notas

- El dashboard ejecuta el bucle de reproduccion TTS y reclama el siguiente mensaje de la cola.
- El overlay muestra los ultimos 10 mensajes con stickers e informacion del chatter.
- Los stickers se guardan en `server/uploads/stickers`.

