# QueueForge Backend

Distributed job processing backend built with Node.js, Express, BullMQ, Redis, and MongoDB.

## Current Status

- Phase 1: Completed
  - API endpoints: `POST /jobs`, `GET /jobs/:id`
  - Redis + BullMQ queue integrated
  - Worker process separated from API
- Phase 2: Completed
  - MongoDB is source of truth for job lifecycle state
  - Redis/BullMQ is execution layer
  - Worker updates MongoDB state (`WAITING -> ACTIVE -> COMPLETED/FAILED`)
  - Edge-case handling and tests verified
- Phase 3: Completed
  - Retry engine with exponential backoff at enqueue
  - Typed failure classification (`RetryableError`, `PermanentError`)
  - Explicit terminal failure semantics (`PERMANENT_ERROR`, `MAX_RETRIES_REACHED`)
  - Optional DLQ routing (behind env flag)
  - Stale ACTIVE timeout safety check
- Phase 4 (Pre-Deployment Checkpoint): Completed
  - API health endpoint (`GET /health`)
  - CORS enabled for UI/API split ports
  - Docker-ready backend image (`backend/Dockerfile`)
  - Environment profile split for safety:
    - `.env.development` for local host runs
    - `.env.docker` for container service-name networking
  - End-to-end queue flow validated in containers (create -> process -> status)
- Phase 5 (Deployment-Ready Polish): Completed
  - Worker processing delay tuned for visible lifecycle transitions in UI demos
  - User-facing status labels simplified in frontend (`Queued`, `Processing`, `Completed`, `Failed`)
  - Raw JSON output removed from user-facing result screens
  - EC2 deployment smoke-tested with public API/frontend reachability

## Tech Stack

- Node.js
- Express
- BullMQ
- Redis (`ioredis`)
- MongoDB (`mongoose`)

## Architecture

Client -> API -> MongoDB (persist WAITING) -> Redis Queue -> Worker -> MongoDB (ACTIVE/COMPLETED/FAILED)

```text
User/Client
  |
  v
API (Node.js/Express)
  |\
  | \-- write initial WAITING state --> MongoDB
  |
  \---- enqueue job ------------------> Redis/BullMQ
                            |
                            v
                        Worker
                            |
                            \-- update ACTIVE/COMPLETED/FAILED --> MongoDB
```

## Flow Explanation

1. `POST /jobs` validates payload and writes a `WAITING` record to MongoDB.
2. API enqueues the job into BullMQ with retry/backoff config.
3. Worker claims the job (`WAITING -> ACTIVE`) and starts processing.
4. On success, worker writes `COMPLETED` + `result` to MongoDB.
5. On retryable failure, worker rethrows and BullMQ retries with exponential backoff.
6. On terminal failure, worker writes `FAILED` with final failure reason (`PERMANENT_ERROR` or `MAX_RETRIES_REACHED`).
7. `GET /jobs/:id` always reads persisted state from MongoDB.

Phase 3 reliability flow:

Client -> API -> MongoDB WAITING -> BullMQ attempts/backoff -> Worker

- retryable failure -> rethrow -> BullMQ retry
- permanent failure -> terminal FAILED
- retries exhausted -> terminal FAILED (MAX_RETRIES_REACHED)
- optional terminal copy -> DLQ

## Job Lifecycle

- `WAITING`
- `ACTIVE`
- `COMPLETED`
- `FAILED`

Terminal failure semantics:

- `PERMANENT_ERROR`
- `MAX_RETRIES_REACHED`
- `STALE_ACTIVE_TIMEOUT`

## API Endpoints

### GET /health
Basic service health check.

Response example:

```json
{
  "status": "ok",
  "service": "queueforge-backend",
  "timestamp": "2026-04-03T00:00:00.000Z"
}
```

### GET /security
Returns current API hardening controls (safe metadata only, no secrets).

Response fields include:

- `helmet` enabled state
- rate-limit window and max values
- CORS allow-list currently loaded
- active JSON request body size limit

### POST /jobs
Create and enqueue a job.

Request body examples:

```json
{
  "type": "email",
  "payload": {
    "recipientEmail": "dev@example.com",
    "subject": "Welcome"
  }
}
```

```json
{
  "type": "report",
  "payload": {
    "reportName": "daily-summary"
  }
}
```

### GET /jobs/:id
Get persisted job status/details from MongoDB.

## Local Setup

### 1) Install dependencies

```powershell
npm install
```

### 2) Start Redis and MongoDB (Docker)

```powershell
docker rm -f queueforge-redis queueforge-mongo 2>$null
docker run -d --name queueforge-redis -p 6379:6379 redis:7-alpine
docker run -d --name queueforge-mongo -p 27017:27017 mongo
```

### 3) Configure environment

Environment profile files:

- `.env.example`: reference template
- `.env.development`: local/dev defaults (local file, not tracked)
- `.env.docker`: Docker/Compose profile (`mongo`, `redis`, `PORT=5000`) (local/server file, not tracked)
- `.env.production`: production-style profile (local/server file, not tracked)

Node reads from `.env`, so copy the profile you want to run:

```powershell
Copy-Item .env.development .env
```

For production-like testing, copy `.env.production` instead and replace placeholders.

For Docker/Compose profile validation from backend folder, copy `.env.docker`:

```powershell
Copy-Item .env.docker .env
```

Minimum required keys:

```env
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
MONGO_URI=mongodb://127.0.0.1:27017/queueforge
JOBS_QUEUE_NAME=queueforge-jobs
WORKER_CONCURRENCY=1
JOB_PROCESSING_DELAY_MS=300
JOB_MAX_ATTEMPTS=3
JOB_RETRY_BACKOFF_DELAY_MS=2000
ENABLE_DLQ=false
DLQ_QUEUE_NAME=queueforge-dlq
JOB_STALE_ACTIVE_THRESHOLD_MS=600000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
REQUEST_BODY_LIMIT=100kb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

Production/Atlas secret handling:

- Do not commit Atlas credentials into repository files.
- Keep tracked env files non-secret (local defaults only).
- Inject real Atlas URI at runtime only (shell env, CI secret, or host secret manager).

PowerShell example:

```powershell
$env:MONGO_URI = "mongodb+srv://<user>:<pass>@cluster.mongodb.net/queueforge"
npm run start:api
```

### 4) Start API and worker

Terminal 1:

```powershell
npm run start:api
```

Terminal 2:

```powershell
npm run start:worker
```

## Testing

Run tests:

```powershell
npm test
```

Phase 3 runtime verification examples:

1. Success path:
- payload without `simulateFailure`
2. Permanent failure path:
- payload with `simulateFailure: "permanent"`
3. Retry exhaustion path:
- payload with `simulateFailure: "retryable"`

Use `GET /jobs/:id` to verify terminal metadata:
- `failedReason`
- `finalFailureReason`
- `retryAttemptsExhausted`

## Lifecycle and UI Mapping

Backend lifecycle values:

- `WAITING`
- `ACTIVE`
- `COMPLETED`
- `FAILED`

Frontend display mapping:

- `WAITING` -> `Queued`
- `ACTIVE` -> `Processing`
- `COMPLETED` -> `Completed`
- `FAILED` -> `Failed`

## Common Issues

### Port 3000 already in use

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Running commands from wrong folder
Always run from backend root:

```powershell
cd C:\Users\rahul\React\queueforge\backend
```

## Phase 4 Plan (Roadmap)

### Step 1: Minimal UI (max 1 day) - Completed

Goal: allow recruiters to create jobs and check job status quickly.

- Page 1: Create Job
  - Select type (`email` or `report`)
  - Enter payload
  - Submit
- Page 2: Job Status
  - Enter `jobId`
  - Fetch status
  - Show `status`, attempts, result/error
- Stack: React (Vite), Axios
- Rule: clear and simple over fancy UI

### Step 2: Mongo Atlas (0.5 day) - Next

- Create Atlas cluster
- Use cloud URI in env:
  - `mongodb+srv://<user>:<pass>@cluster.mongodb.net/queueforge`
- Whitelist IP (`0.0.0.0/0` temporarily for setup)
- Keep credentials in env vars only

### Step 3: Dockerize (1 day) - Completed for local stack

Goal: run the system with one command.

- Containers: API, Worker, Redis, optional local Mongo
- Use Docker Compose v2: `docker compose up`
- Ensure container networking and env wiring are correct

### Step 4: AWS Deployment (1-2 days) - Completed (smoke-tested)

Keep deployment simple:

- Use EC2 (Ubuntu)
- Install Node + Docker
- Clone repo, set env, run `docker compose up -d --build`
- Expose API port (for example `5000`)

### Step 5: Final polish (0.5 day) - Pre-release

README additions at this stage:

- Live URL
- Local run steps
- Architecture diagram
- API endpoints
- Frontend API URL config (for example `API_URL=https://<ec2-ip>`)

### Target System After Phase 4

`User -> React UI -> API (EC2) -> Redis -> Worker -> Mongo Atlas`
