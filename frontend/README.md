# QueueForge Frontend

React + Vite UI for QueueForge job flow.

## Local Development

Run from `frontend/`:

```powershell
npm install
npm run dev
```

Local dev URL:

- Frontend dev: `http://localhost:5173`

## Docker Runtime

From repository root (`queueforge/`):

```powershell
docker compose up --build -d
```

Docker URLs:

- Frontend (container): `http://localhost:3001`
- API (container): `http://localhost:5000`

## Port Strategy

This project intentionally separates local and Docker frontend ports to avoid collisions:

- Local Vite dev server: `5173`
- Docker frontend published port: `3001`
