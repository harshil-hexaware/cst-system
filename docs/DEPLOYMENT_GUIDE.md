# Deployment Guide

## 1. Local Development (docker compose)

**Prerequisites:** Docker Desktop / Docker Engine + Compose v2, and
this repo cloned locally (this guide assumes you're running it on
your own machine — the sandbox this system was built in has no
Docker or network access, see `README.md` for what was actually
executed here vs. what you'll run locally).

```bash
# 1. From the project root, create the shared secrets file
cp .env.example .env
# Edit .env and set real values, especially:
#   JWT_ACCESS_SECRET   -> openssl rand -base64 48
#   JWT_REFRESH_SECRET  -> openssl rand -base64 48 (a DIFFERENT value)
#   DB_PASSWORD

# 2. Build and start everything
docker compose up --build

# 3. Wait for healthchecks, then verify:
curl http://localhost:4000/health          # api-gateway
curl http://localhost:4000/api-docs        # Swagger UI (open in browser)
open http://localhost:3000                 # frontend
```

The Postgres container runs `database/init.sql` automatically on
first boot (via the `docker-entrypoint-initdb.d` mount) — no separate
migration step needed for this MVP. Seed data includes the 4 roles
and default SLA rules; you'll want to add at least one category via
`POST /api/tickets/categories` (as an ADMIN) before creating tickets,
since `categoryId` is required.

## 2. Role-based account creation flow
This system follows a strict provisioning model — nobody can grant
themselves elevated privileges through the public API:

| Role | Self-register? | Login? | Created by |
|---|:---:|:---:|---|
| CUSTOMER | ✅ Yes | ✅ | Self |
| AGENT | ❌ No | ✅ | ADMIN or MANAGER |
| MANAGER | ❌ No | ✅ | ADMIN only |
| ADMIN | ❌ No | ✅ | Bootstrap script only — **never** via any API endpoint, not even by another admin |

**Step 1 — Bootstrap the very first admin** (one-time, run once per
environment):
```bash
cd services/auth-service
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='Str0ng!Passw0rd' \
ADMIN_FIRST_NAME=Jane \
ADMIN_LAST_NAME=Doe \
npm run seed:admin
```
Or against a running Docker Compose stack, from the project root:
```bash
docker compose run --rm \
  -e ADMIN_EMAIL=you@example.com \
  -e ADMIN_PASSWORD='Str0ng!Passw0rd' \
  -e ADMIN_FIRST_NAME=Jane \
  -e ADMIN_LAST_NAME=Doe \
  auth-service npm run seed:admin
```
This is idempotent — re-running it for an existing email is a no-op
unless you pass `--force`. It writes directly to both `users` (via
Sequelize) and `user_profiles` (same physical DB in this MVP), so the
admin has a working profile immediately without needing RabbitMQ up.

**Step 2 — Admin creates a Manager:**
```bash
# Person registers normally first (always lands as CUSTOMER)
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"manager1@example.com","password":"Str0ng!Passw0rd","firstName":"Sam","lastName":"Lee"}'
# capture their "id" from the response, then admin logs in and promotes:
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Str0ng!Passw0rd"}'
curl -X PATCH http://localhost:4000/api/users/<manager1-id>/role \
  -H "Authorization: Bearer <admin-access-token>" -H "Content-Type: application/json" \
  -d '{"role":"MANAGER"}'
```

**Step 3 — Admin *or* Manager creates an Agent** (same pattern, either
an admin's or a manager's access token works):
```bash
curl -X PATCH http://localhost:4000/api/users/<agent1-id>/role \
  -H "Authorization: Bearer <admin-or-manager-access-token>" -H "Content-Type: application/json" \
  -d '{"role":"AGENT"}'
```

The server enforces all of this independently of the frontend — a
MANAGER token that tries to assign `"role":"MANAGER"` or `"role":"ADMIN"`
gets a `403 FORBIDDEN`, and `"role":"ADMIN"` is rejected from *any*
caller, at both the Joi validation layer and the service layer (see
`userService.changeRole` in `services/user-service`).

Each promoted person needs to log in again (or wait for their current
access token to expire, max 15 min by default) to receive a JWT
carrying the new role — the change is propagated from user-service to
auth-service via a `user.role_changed` RabbitMQ event.

## 3. Running tests per service
```bash
cd services/auth-service && npm ci && npm test
cd services/user-service && npm ci && npm test
cd services/ticket-service && npm ci && npm test
cd services/api-gateway && npm ci && npm test
cd frontend && npm ci && npm test
```

## 4. Production deployment considerations
- **Secrets:** never commit `.env`; use your platform's secrets
  manager (AWS Secrets Manager, GCP Secret Manager, Kubernetes
  Secrets) and inject at deploy time.
- **Database:** run Postgres as a managed service (RDS/Cloud SQL) with
  automated backups; `init.sql` should become a proper migration tool
  (Sequelize CLI migrations) rather than a one-shot init script once
  the schema needs to evolve without data loss.
- **RabbitMQ:** use a managed/clustered instance (Amazon MQ, CloudAMQP)
  with a dead-letter exchange configured — the code currently `nack`s
  failed events without requeue as a placeholder; wire a real DLQ
  before production.
- **File uploads:** the `ticket_uploads` Docker volume is fine for a
  single-host demo; for real deployments swap `multer.diskStorage` for
  an S3-compatible object store (`multer-s3`) so ticket-service stays
  stateless and horizontally scalable.
- **TLS:** terminate TLS at a load balancer / ingress in front of the
  gateway and frontend; none of the services listen on HTTPS directly.
- **Horizontal scaling:** every backend service is stateless (JWT auth,
  no in-memory session) except for the local file uploads noted above,
  so they scale horizontally behind the gateway once uploads move to
  object storage.
- **CI/CD:** see `.github/workflows/ci-cd.yml` — install → lint → test
  → coverage → SonarQube → Docker build → deploy, per-service matrix
  build for the backend, separate job for the frontend.
