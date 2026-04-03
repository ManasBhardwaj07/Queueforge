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

## Tech Stack

- Node.js
- Express
- BullMQ
- Redis (`ioredis`)
- MongoDB (`mongoose`)

## Architecture

Client -> API -> MongoDB (persist WAITING) -> Redis Queue -> Worker -> MongoDB (ACTIVE/COMPLETED/FAILED)

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

Create `.env` (or copy from `.env.example`) with at least:

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

## Next Phases

- Phase 3: Retries, exponential backoff, failure handling, DLQ
- Phase 4: Priority, concurrency tuning, idempotency
