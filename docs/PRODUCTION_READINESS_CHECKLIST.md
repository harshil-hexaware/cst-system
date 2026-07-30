# Production Readiness Checklist

## Done in this MVP pass
- [x] Auth, User, Ticket microservices — independently built, tested,
      and Dockerized
- [x] API Gateway with perimeter auth check, proxying, Swagger UI
- [x] Event-driven communication (RabbitMQ) between auth-service and
      user-service; ticket-service publishes lifecycle events for a
      future notification-service to consume
- [x] Full ticket status workflow with role-aware transition rules
- [x] RBAC for all 4 roles
- [x] Comments (public + internal), attachments with secure upload
      handling
- [x] SLA due-date calculation and breach flagging (schema + logic in
      place; a background job to sweep and flip `sla_breached` on
      overdue tickets is the one piece not wired — see below)
- [x] Customer/Agent/Manager-Admin dashboards (role-scoped aggregate
      counts)
- [x] Docker Compose for one-command local spin-up
- [x] CI/CD pipeline definition (install → lint → test → coverage →
      SonarQube → Docker build → deploy)
- [x] Health (`/health`) and readiness (`/ready`, DB-connectivity
      check) endpoints on every backend service
- [x] Structured JSON logging with request tracing
- [x] Unit tests for all core business logic; **24 pure-logic tests
      actually executed and passing in this environment** (state
      machine, RBAC matrix, password policy, auto-assignment) — see
      the conversation transcript / `shared/domain/__tests__`

## Explicitly out of scope for this pass (by agreed MVP scope)
- [ ] **Notification Service** — event routing keys (`ticket.created`,
      `ticket.assigned`, `ticket.resolved`, etc.) are already published;
      a consumer service that turns these into emails + in-app
      notifications is the natural next build.
- [ ] **Reporting Service** — ticket trends, resolution time, CSAT;
      the raw data (`ticket_history`, timestamps) is already captured,
      needs an aggregation service/materialized views.
- [ ] **SLA breach sweep job** — `isBreached()` is a pure, tested
      function; needs a scheduled job (cron container or
      `node-cron` inside ticket-service) to run it periodically and
      flip `tickets.sla_breached`, then publish an `sla.breached` event.
- [ ] **Admin UI pages** for User Management / Category Management /
      SLA Configuration — the backend endpoints exist
      (`/api/users`, `/api/tickets/categories`) but dedicated frontend
      pages weren't built in this pass; only Customer/Agent dashboards
      and the shared ticket views were built per the agreed MVP scope.
- [ ] **Redis caching** — listed as optional in the original spec; not
      needed at MVP scale, add if the `/api/tickets` list endpoint
      becomes a bottleneck.

## Must-fix before real production traffic
- [ ] Rotate refresh tokens on use (see Security Checklist)
- [ ] Move file uploads to S3-compatible object storage
- [ ] Add a dead-letter queue for failed RabbitMQ event processing
- [ ] Replace `database/init.sql` with versioned Sequelize migrations
- [ ] Wire `npm audit`/Dependabot into CI
- [ ] Load test the auto-assignment endpoint (ticket-service →
      user-service synchronous call is a potential latency/availability
      coupling point under load — consider caching agent workload or
      making assignment async)
