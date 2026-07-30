# Entity-Relationship Diagram

Full DDL: [`database/init.sql`](../database/init.sql). Diagram below
covers the MVP-relevant tables (notifications/audit_logs included for
completeness since their schema already exists for the next phase).

```mermaid
erDiagram
    ROLES ||--o{ USERS : has
    USERS ||--|| USER_PROFILES : "has one"
    USERS ||--o{ TICKETS : "raises (customer_id)"
    USERS ||--o{ TICKETS : "resolves (assigned_agent_id)"
    CATEGORIES ||--o{ TICKETS : categorizes
    TICKETS ||--o{ TICKET_COMMENTS : has
    TICKETS ||--o{ TICKET_ATTACHMENTS : has
    TICKET_COMMENTS ||--o{ TICKET_ATTACHMENTS : "may attach to"
    TICKETS ||--o{ TICKET_HISTORY : has
    TICKETS ||--o{ NOTIFICATIONS : triggers

    ROLES {
        int id PK
        string name
    }
    USERS {
        uuid id PK
        string email UK
        string password_hash
        int role_id FK
        boolean is_active
    }
    USER_PROFILES {
        uuid id PK
        uuid user_id FK "UK"
        string email
        string role
        string first_name
        string last_name
        int workload_count
    }
    CATEGORIES {
        int id PK
        string name UK
    }
    TICKETS {
        uuid id PK
        string ticket_number UK
        string subject
        string priority
        string status
        uuid customer_id
        uuid assigned_agent_id
        timestamp due_at
        boolean sla_breached
    }
    TICKET_COMMENTS {
        uuid id PK
        uuid ticket_id FK
        uuid author_id
        boolean is_internal
    }
    TICKET_ATTACHMENTS {
        uuid id PK
        uuid ticket_id FK
        uuid comment_id FK
        string file_name
        string mime_type
    }
    TICKET_HISTORY {
        uuid id PK
        uuid ticket_id FK
        uuid changed_by
        string field_changed
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id
        string type
        boolean is_read
    }
```

## Notes
- `customer_id` / `assigned_agent_id` on `tickets` are **plain UUID
  columns, not foreign keys** to `users` — ticket-service and
  auth-service are independently deployable and must not share a
  hard DB-level dependency. Identity is asserted via the JWT at
  request time instead.
- Indexing strategy and query-optimization notes are inline as SQL
  comments at the bottom of `database/init.sql` (composite index on
  `(status, assigned_agent_id)` for the agent dashboard query,
  keyset-pagination recommendation for ticket lists at scale).
