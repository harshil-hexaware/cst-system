# Security Checklist

## Implemented in this build
- [x] Password hashing with bcrypt (cost factor 12, configurable)
- [x] JWT access + refresh tokens; refresh tokens hashed (SHA-256) at
      rest, never stored in plaintext
- [x] Password policy enforced both client-side (UX) and server-side
      (authoritative) — 10+ chars, upper/lower/digit/special, no whitespace
- [x] RBAC enforced at two levels: coarse route permissions +
      fine-grained per-transition rules in the ticket state machine
- [x] Helmet security headers on every service
- [x] CORS configured via env var, not wildcarded in a way that
      reflects arbitrary origins with credentials
- [x] Rate limiting globally (per service) and a stricter limiter on
      `/api/auth/login` and `/api/auth/register` to blunt credential
      stuffing / registration spam
- [x] Request body size limits (`express.json({ limit })`) sized per
      service to blunt JSON-bomb style DoS
- [x] Joi validation on every mutating endpoint; unknown fields stripped
- [x] SQL injection prevented structurally — all queries go through
      Sequelize's parameterized query builder, no raw string
      interpolation into SQL anywhere in the codebase
- [x] File upload hardening: MIME-type allowlist, file size cap,
      server-generated random filenames (prevents path traversal /
      overwrite via a crafted `originalname`), upload directory created
      with restricted ownership in the Docker image
- [x] No secrets hardcoded — all pulled from environment variables,
      `.env.example` documents required vars without real values
- [x] Structured JSON logging with `traceId` correlation, no
      passwords/tokens ever logged
- [x] Login/forgot-password return generic messages (no user
      enumeration via differing error text)
- [x] Docker images run as a non-root `appuser`, multi-stage builds
      keep `devDependencies` out of the runtime image

## Explicitly deferred (documented, not silently skipped)
- [ ] CSRF protection — not applicable in this build's threat model
      (stateless Bearer-token API, no cookie-based session), but
      **required** if you switch to storing tokens in cookies instead
      of `localStorage`. If you do that switch, add `csurf` or a
      double-submit-cookie pattern at the gateway.
- [ ] Refresh-token rotation on every use (currently single
      long-lived refresh token per session, revoked wholesale on
      password change/logout — rotate-on-use is a stronger pattern,
      flagged for hardening).
- [ ] Centralized secrets manager integration (currently plain env
      vars — fine for this MVP, insufficient for production, see
      Deployment Guide).
- [ ] Web Application Firewall / DDoS protection at the edge (belongs
      to your cloud provider / CDN layer, outside this codebase's scope).
- [ ] Dependency vulnerability scanning (`npm audit` / Snyk / Dependabot)
      wired into CI — add as a pipeline step alongside the existing
      SonarQube scan.
- [ ] Encryption at rest for the Postgres volume and the uploads
      volume — configure at the infrastructure layer (managed DB
      encryption, encrypted EBS/persistent-disk).

## Known accepted trade-off
Changing a user's role via `PATCH /api/users/:userId/role` updates
user-service's denormalized copy immediately, but any already-issued
JWT keeps its **old** role claim until it expires (max 15 minutes with
the default config). This is the standard trade-off of stateless JWTs
vs. a session store; documented rather than "fixed" by adding a
lookup-per-request that would defeat the purpose of using JWTs at all.
