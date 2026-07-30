# User Manual

## Customer
1. **Register** at `/register`, then **sign in** at `/login`.
2. **Create a ticket**: Dashboard → "+ New Ticket" → fill subject,
   description, category, priority → Submit.
3. **Track a ticket**: Tickets → click a ticket number to see its
   status, your conversation, and attachments.
4. **Respond**: add a comment from the ticket detail page.
5. **Close or reopen**: once an agent marks your ticket *Resolved*,
   you'll see "Move to CLOSED" and "Move to REOPENED" action buttons —
   confirm it's fixed (Close) or reopen it if it isn't.

## Support Agent
1. Sign in — your dashboard shows tickets **assigned to you**.
2. Open a ticket, use the action buttons to move it through the
   workflow (e.g. OPEN → IN_PROGRESS → RESOLVED).
3. Add **internal notes** (checkbox on the comment form) — customers
   never see these — or public comments they will see.
4. Upload attachments as needed.

## Support Manager
1. Dashboard shows **system-wide** counts (all tickets, not just your own).
2. Assign an unassigned ticket to an agent via
   `POST /api/tickets/:id/assign` (manual) or `/auto-assign` (picks the
   least-loaded active agent automatically) — a dedicated "Assign"
   button in the UI is a natural next addition (see Production
   Readiness Checklist).
3. You can perform the wider set of status transitions agents can't
   (e.g. closing directly from ESCALATED).

## Administrator
1. Manage users: `GET/PATCH /api/users` — change roles, activate/deactivate.
2. Manage categories: `POST/PATCH /api/tickets/categories`.
3. Full API reference: open `/api-docs` on the gateway (Swagger UI)
   once the stack is running.
