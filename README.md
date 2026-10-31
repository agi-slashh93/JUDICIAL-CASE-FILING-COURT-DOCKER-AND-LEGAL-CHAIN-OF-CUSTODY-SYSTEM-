# Judicial Case Filing Court Docket and Legal Chain of Custody System

Team 16 mini project implementation based on the supplied ER diagram, relational schema, and MySQL DDL. The system manages court cases, hearings, documents, evidence, and immutable custody events through a Next.js web interface.

## What is included

- Next.js App Router interface with dashboard, case intake, evidence registration, and role-aware session UI.
- MySQL 8 normalized transactional schema with primary/foreign keys, checks, indexes, a full-text index, views, a trigger, and a transaction-backed stored procedure.
- MongoDB collection model for unstructured audit events and case notes, with indexes and text retrieval.
- API-layer validation with Zod, bcrypt password verification, signed HTTP-only session cookies, and environment-based configuration.
- Seed data, demonstration queries, unit tests, and a requirements mapping below.

## Setup

1. Install Node.js 20+, MySQL 8+, and MongoDB 7+.
2. Copy `.env.example` to `.env` and set values. Generate a strong `AUTH_SECRET`.
3. Run `mysql < db/mysql/01_schema.sql` and then `mysql < db/mysql/02_seed.sql`.
4. Run `mongosh < db/mongo/01_indexes.js`.
5. Replace the two seed password placeholders with bcrypt hashes. For example, run `node -e "console.log(require('bcryptjs').hashSync('ChangeMe123!', 10))"` after `npm install`.
6. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`.

The seed accounts are `admin@example.com` and `staff@example.com`; set their passwords only after replacing the placeholder hashes. Never commit `.env` or real credentials.

## Requirements coverage

| Requirement | Implementation |
|---|---|
| Meaningful non-CRUD domain | Court docket, hearings, document filing, and legal chain of custody |
| SQL database | MySQL 8 in `db/mysql` |
| Second paradigm | MongoDB audit events and case notes in `db/mongo` |
| ER and relational design | Preserved from the supplied PDF and implemented as nine related tables |
| DDL | CREATE, ALTER, DROP, keys, constraints, indexes, views, trigger and procedure |
| DML | API INSERTs plus JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries and full-text search in `03_queries.sql` |
| Four advanced concepts | Transaction, view, stored procedure, trigger, indexing, full-text search and Mongo text index |
| Next.js interface | Dashboard and forms in `app/` |
| Authentication and roles | ADMIN and STAFF roles, bcrypt verification, signed HTTP-only cookie |
| Validation and security | Zod/API validation, MySQL constraints, parameterized queries and environment variables |
| Git/GitHub readiness | `.gitignore`, README setup, tests and clean project structure |

## Architecture

```text
Browser -> Next.js pages/components -> Route Handlers -> MySQL (system of record)
                                             |-> MongoDB (audit events and notes)
```

## Testing and demonstration

Run `npm test` for validation tests. Demonstrate the dashboard, create a case, register evidence, show the automatically inserted initial `chain_log` row, call `CALL sp_transfer_evidence(...)`, run `03_queries.sql`, and show the MongoDB `audit_events` collection. Capture those screens for the final presentation/report.

## Team contributions

| Contributor | Student ID | Deliverables |
|---|---|---|
| Agilesh R | PES2UG24CS385 | MySQL schema and constraints (`db/mysql/01_schema.sql`), seed and demonstration queries (`db/mysql/02_seed.sql`, `db/mysql/03_queries.sql`), custody procedure and trigger, and SQL/API integration. |
| Rajath N Gonda | PES2UG24CS394 | Next.js interface (`app/`), authentication and session handling (`lib/auth.ts`, `app/api/auth/`), request validation (`lib/validation.ts` and `app/api/`), MongoDB audit model (`lib/mongo.ts`, `db/mongo/`), validation tests (`tests/`), and project documentation. |

Keep each member's work in commits authored by that member so the Git history records both contributions. The files above identify each person's project area; a responsibility listing is not a substitute for accurate commit authorship.
