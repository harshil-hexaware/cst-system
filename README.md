# Customer Support Ticketing System

A microservices-based, production-oriented customer support platform.
**MVP scope built in this pass** (agreed with stakeholder): Auth +
User Management + Ticket Management (CRUD, comments, attachments,
status workflow, RBAC) + Customer/Agent/Manager dashboards, as true
independently-deployable microservices behind an API Gateway.

## What's here

```
cst-system/
├── docker-compose.yml          # one-command local stack
├── .env.example                 # shared secrets (copy to .env)
├── database/init.sql            # full normalized schema + seed data
├── services/
│   ├── api-gateway/              # :4000 — routing, JWT pre-check, Swagger UI
│   ├── auth-service/              # :4001 — register/login/JWT/password lifecycle
│   ├── user-service/              # :4002 — profiles, roles, RabbitMQ consumer
│   └── ticket-service/            # :4003 — tickets, comments, attachments, SLA
├── frontend/                    # React + Redux Thunk + Bootstrap 5 SPA
├── shared/domain/__tests__/     # dependency-free logic + tests (see below)
├── docs/                        # HLD, LLD, ER diagram, deployment guide,
│                                 # security checklist, readiness checklist, user manual
└── .github/workflows/ci-cd.yml  # install → lint → test → coverage → Sonar → build → deploy
```

## ⚠️ What was actually verified in this sandbox, and why

The environment this was built in has **no internet access and no
pre-installed Docker/Postgres/RabbitMQ/npm registry**. That means two
different levels of verification happened:

1. **Fully executed and passing**: the framework-free business logic
   (`shared/domain/*.js` — ticket status state machine, RBAC matrix,
   password policy, auto-assignment algorithm) has zero external
   dependencies, so it was run for real with Node's built-in test
   runner: **24/24 tests passed**. This is the logic that decides who
   can do what to a ticket — the part most worth trusting before you
   even run `docker compose up`.
2. **Syntax-checked, not runtime-executed**: everything that depends
   on Express/Sequelize/RabbitMQ/React (i.e. almost every other file)
   was verified with `node --check` (backend) and manual review
   (React/JSX, since no JSX parser was available offline). It has
   **not** been run against a live Postgres/RabbitMQ/browser here.

**Run it locally to get full confidence:**
```bash
cp .env.example .env        # then edit in real secrets, see comments in the file
docker compose up --build
```
Full instructions, including how to run each service's Mocha/Jest
suite individually: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

## Role-based account provisioning (finalized model)

| Role | Self-register? | Login? | Created by |
|---|:---:|:---:|---|
| CUSTOMER | ✅ Yes | ✅ | Self |
| AGENT | ❌ No | ✅ | ADMIN or MANAGER |
| MANAGER | ❌ No | ✅ | ADMIN only |
| ADMIN | ❌ No | ✅ | Bootstrap script only (`services/auth-service/scripts/seedAdmin.js`) — never via any API endpoint |

Full walkthrough with exact commands: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md#2-role-based-account-creation-flow).

**Frontend pages per role:**
- **Customer:** Dashboard, New Ticket, Ticket List/Details (own tickets only)
- **Agent:** Dashboard, Ticket List/Details (assigned tickets only), status workflow, internal notes
- **Manager:** everything Agent has system-wide, plus **Assign Tickets** (manual + auto-assign) and **User Management** (promote Customer → Agent only)
- **Admin:** **User Management** (full — including promoting to Manager, activate/deactivate), **Category Management**, **SLA Configuration**

## Quick links
- Architecture & diagrams: [`docs/HLD.md`](docs/HLD.md), [`docs/LLD.md`](docs/LLD.md)
- Database: [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md), [`database/init.sql`](database/init.sql)
- Deploy: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- Security: [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md)
- What's left / what's deferred: [`docs/PRODUCTION_READINESS_CHECKLIST.md`](docs/PRODUCTION_READINESS_CHECKLIST.md)
- How to use it: [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)
- API reference: run the stack, open `http://localhost:4000/api-docs`

## Tech stack (as specified)
React 18 · Redux Thunk · Axios · Bootstrap 5 · React Router · Node 18 ·
Express · Sequelize · PostgreSQL · RabbitMQ · Winston · Joi · Docker /
Docker Compose · GitHub Actions · SonarQube · Mocha/Chai/Sinon (backend)
· Jest/RTL (frontend)

## Not built in this pass (see readiness checklist for the full list)
Notification Service and Reporting Service as standalone microservices
— their event routing keys and DB schema already exist so they're a
clean follow-on, but weren't part of the MVP scope agreed for this
build.
