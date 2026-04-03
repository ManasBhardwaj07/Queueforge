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

## Run With Docker

From repository root:

```powershell
docker compose up --build -d
```

Endpoints:

- Frontend: `http://localhost:3000`
- API: `http://localhost:5000`
- Health: `http://localhost:5000/health`

## Next Step (Phase 5)

1. Switch MongoDB to Atlas
2. Verify stack locally with Docker
3. Deploy to AWS EC2
4. Run Docker Compose on EC2
