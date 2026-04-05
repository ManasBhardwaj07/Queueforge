# QueueForge

QueueForge is a distributed job processing system with a React frontend and a Node.js backend using BullMQ, Redis, and MongoDB.

## Repository Layout

- `backend/`: API + worker services, tests, and backend docs
- `frontend/`: React (Vite) multi-page UI flow
- `docker-compose.yml`: local full-stack orchestration (frontend + api + worker + redis + mongo)

## Current Checkpoint

- Phase 1: Core API + queue + worker completed
- Phase 2: MongoDB source-of-truth lifecycle completed
- Phase 3: Reliability/retry semantics completed
- Phase 4 (pre-deployment checkpoint):
  - multi-page guided UI flow completed
  - Docker-based full local stack completed
  - env profile split completed (`backend/.env.development` vs `backend/.env.docker`)
- Phase 5 (deployment-ready polish):
  - production-style EC2 deployment path validated
  - browser UX labels mapped for end users (`Queued`, `Processing`, `Completed`, `Failed`)
  - raw JSON blocks removed from user-facing result views
  - visible worker processing delay for clearer lifecycle transitions

## Run With Docker

From repository root:

```powershell
docker compose up --build -d
```

Use `docker compose` (Compose v2). Avoid legacy `docker-compose` v1.

Endpoints:

- Frontend (Docker): `http://localhost:3001`
- API: `http://localhost:5000`
- Health: `http://localhost:5000/health`

## Port Map (Conflict-Free)

- Local backend API: `3000`
- Local frontend dev (Vite): `5173`
- Docker backend API: `5000`
- Docker frontend: `3001`

## Security Baseline

- Keep secrets out of tracked files.
- Use non-secret defaults in tracked env templates.
- Inject credentials at runtime only (`MONGO_URI`, etc.) via shell, CI secrets, or host secret manager.
- Rotate Atlas DB credentials immediately if any credential was previously exposed.
- Track only example env files in GitHub (`backend/.env.example`, `frontend/.env.example`).

## UI Status Labels

Backend status values are preserved internally, but UI labels are mapped to user-friendly text:

- `WAITING` -> `Queued`
- `ACTIVE` -> `Processing`
- `COMPLETED` -> `Completed`
- `FAILED` -> `Failed`

## AWS EC2 Deploy (Validated)

High-level path:

1. Launch Ubuntu EC2 and open inbound ports 22, 3001, 5000 as needed.
2. Install Docker and use Compose v2 (`docker compose`).
3. Clone repository.
4. Create server-local `backend/.env.docker` with real Atlas URI (not committed).
5. Set frontend build arg `VITE_API_URL` to `http://<ec2-public-ip>:5000`.
6. Run `docker compose up -d --build`.
7. Verify:
  - `http://<ec2-public-ip>:3001`
  - `http://<ec2-public-ip>:5000/health`

## Delivery Status

1. MongoDB Atlas integration completed.
2. Local and Docker validation completed.
3. AWS EC2 deployment completed.
4. Public API and frontend smoke-tested.
