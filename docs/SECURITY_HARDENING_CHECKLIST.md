# Security Hardening Checklist

## 1) Immediate actions

- Rotate MongoDB Atlas DB user password.
- Revoke any old DB user credential that was exposed.
- Update all runtime environments with new `MONGO_URI`.
- Verify app connectivity after rotation.

## 2) Secrets policy

- Never commit real secrets to git-tracked files.
- Keep tracked env files as non-secret templates/defaults.
- Inject secrets at runtime only:
  - Local: shell env variables
  - CI: GitHub Actions secrets
  - Server: systemd environment file, Docker secrets, or cloud secret manager

## 3) Repository hygiene

- Ensure `.env` remains gitignored.
- Ensure QA artifact folders (like `.tmp-ui/`) are ignored.
- Run secret scan in CI on push/PR.

## 4) Runtime checks

- Verify `/health` and `/ready` endpoints after credential changes.
- Verify `/security` endpoint reports active hardening controls.
- Validate create/track/result flows still work after secret rotation.

## 5) Implemented hardening controls

- HTTP security headers enabled via Helmet.
- Request rate limiting enabled.
- Request JSON body-size limit enabled.
- CORS narrowed to allow-listed origins.
- CI includes secret scan + dependency audits.

## 6) Validation commands

```powershell
cd backend
npm test
npm audit --audit-level=high

cd ..\frontend
npm run lint -- --max-warnings=0
npm run build
npm audit --audit-level=high
```

## 7) Rotation runbook (Atlas)

1. In Atlas, create a new DB user password.
2. Update runtime `MONGO_URI` with new password.
3. Restart API + worker.
4. Run smoke test (`POST /jobs`, `GET /jobs/:id`).
5. Remove old credential access.
