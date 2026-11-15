# Judicial Case Filing, Court Docket and Legal Chain of Custody System

## 1. Project overview

This project is a web-based judicial case management system. It helps authorized court staff register cases, record accused-person details, upload evidence media, monitor case status, and preserve a legal chain-of-custody history.

The project combines:

- **Next.js and React** for the web interface and API route handlers.
- **MySQL 8** for normalized, transactional court and evidence data.
- **MongoDB** for append-only audit events and flexible case notes.
- **Local file storage** for accused photographs and audio/video evidence.
- **Bcrypt, signed cookies, and role checks** for authentication and authorization.

The central design idea is that MySQL is the system of record for structured legal data, while MongoDB stores flexible audit information that can grow without changing the relational schema.

## 2. Why this domain was selected

The project is more than a simple CRUD application. A court case has a lifecycle and evidence has a custody lifecycle:

1. A staff member files a case.
2. The case is associated with a court and an accused person.
3. Evidence is registered against the case.
4. Every evidence movement must be recorded.
5. The case can move from open, to in progress, to closed or archived.
6. A closed case appears in the solved-cases list.
7. Administrative deletion removes the case and its dependent records under controlled authorization.

This gives the project meaningful relationships, transactions, constraints, reporting queries, triggers, procedures, and audit requirements.

## 3. Development workflow

### Step 1 — Requirements analysis

The supplied mini-project requirements and design material were used to identify:

- The project title and judicial domain.
- Required ER and relational design.
- Required DDL and DML operations.
- The need for an additional database paradigm.
- Security, validation, and demonstration requirements.

### Step 2 — Relational design

The central entity was identified as `case`. Supporting entities were normalized into separate relations instead of storing everything in one large table. The final relational model contains:

`role`, `user`, `court`, `judge`, `case`, `accused_person`, `document`, `hearing`, `evidence`, and `chain_log`.

Each table has a primary key. Foreign keys connect related records and checks restrict values such as user status, case status, hearing status, evidence status, and accused age.

### Step 3 — MySQL DDL

The file `db/mysql/01_schema.sql` creates the database and tables. It also demonstrates:

- `CREATE DATABASE`, `CREATE TABLE`, `ALTER TABLE`, and `DROP` operations.
- Primary keys and unique keys.
- Foreign keys with cascading case deletion where appropriate.
- `NOT NULL`, `CHECK`, and default constraints.
- Indexes for status/date searches and custody history.
- A full-text index on document title and description.
- The `v_user_roles` view for authentication lookup.
- The `v_case_dashboard` view for dashboard reporting.
- The `trg_evidence_initial_chain` trigger.
- The `sp_transfer_evidence` stored procedure.

### Step 4 — Seed data and SQL demonstrations

The file `db/mysql/02_seed.sql` inserts initial roles, a court, administrator/staff users, one demonstration case, a hearing, and one evidence item.

The file `db/mysql/03_queries.sql` demonstrates:

- Joins.
- Aggregation with `COUNT`.
- `GROUP BY` and `HAVING`.
- `ORDER BY`.
- Scheduled-hearing reporting.
- Full-text search.
- A subquery that compares court case counts with the average.

### Step 5 — MongoDB model

MongoDB was added as the second database paradigm. It stores:

- `audit_events`: login, case creation, evidence registration, status changes, and case deletion events.
- `case_notes`: flexible notes associated with cases.

The indexes in `db/mongo/01_indexes.js` support event lookup by type/date, event lookup by case/date, and text search over notes.

### Step 6 — Web application

The Next.js App Router provides pages for:

- `/login` — sign-in.
- `/` — dashboard.
- `/cases` — all cases and administrative actions.
- `/cases/new` — case intake.
- `/cases/solved` — closed cases.
- `/evidence/new` — evidence registration and media upload.

The application uses server components for database-backed pages and route handlers under `app/api` for protected operations.

## 4. System architecture

```text
User browser
    |
    v
Next.js pages and React components
    |
    v
Protected API route handlers
    |----------------------|
    v                      v
MySQL 8                MongoDB
structured records     audit events and notes
    |
    v
Local storage folders
accused photographs and evidence media
```

## 5. Authentication workflow

1. The user opens `/login`.
2. The browser sends the email and password to `POST /api/auth/login`.
3. The API looks up the active user through `v_user_roles`.
4. The submitted password is compared with the stored bcrypt hash.
5. If valid, the server creates an eight-hour signed JWT session.
6. The JWT is stored in an HTTP-only cookie called `jcc_session`.
7. A `LOGIN` event is written to MongoDB.
8. Every protected request reads and verifies this cookie.
9. Logout removes the session cookie through `POST /api/auth/logout`.

The browser never receives the password hash, and the password is not stored in browser storage.

### Roles

- **ADMIN**: normal staff operations plus case deletion and administrative user operations.
- **STAFF**: case, accused, and evidence operations, including changing case status.

## 6. Dashboard workflow

1. The home page checks for a valid session.
2. Unauthenticated users see the project landing page and a link to sign in.
3. Authenticated users query `v_case_dashboard`.
4. The view joins cases with courts, documents, evidence, and scheduled hearings.
5. The dashboard calculates totals for cases, evidence, documents, and upcoming hearings.
6. The most recent cases are displayed with their current status and next hearing date.

## 7. Case intake workflow

The user opens `/cases/new` and enters:

- Case number.
- Case title.
- Case type.
- Filing date.
- Court ID.
- Initial status.
- Accused person's full name.
- Optional identity number, nationality, address, age, gender, and phone.
- Required accused photograph.

When the form is submitted:

1. The browser sends multipart form data to `POST /api/cases`.
2. The API checks that a session exists.
3. `caseSchema` validates the case fields.
4. `accusedSchema` validates the accused fields.
5. The API verifies that the photo is an image and is at most 5 MB.
6. A MySQL transaction begins.
7. The case is inserted into the `case` table.
8. The photo is saved with a random filename in `storage/accused`.
9. The accused record is inserted into `accused_person` with the photo filename.
10. The transaction commits.
11. A `CASE_CREATED` audit event is inserted into MongoDB.
12. The API returns the new case ID.

If any database or file operation fails, the transaction is rolled back and the request returns an error.

## 8. Accused identity and photo workflow

The `accused_person` table keeps identity information separate from the case record because one case may have more than one accused person. The photograph is not stored as a binary database field. Instead:

1. The image is written to `storage/accused`.
2. A generated random filename is stored in `photo_path_url`.
3. The protected photo route `/api/accused/photos/[fileName]` serves the image only through the application.
4. The case remains linked through `accused_person.case_id`.

This keeps the relational data smaller and allows controlled file delivery.

## 9. Evidence and audio/video workflow

The user opens `/evidence/new` and enters:

- Case ID.
- Evidence code.
- Description.
- Evidence type.
- Seized-from location.
- Seized date.
- Current location.
- An audio or video file.

When submitted:

1. The browser sends multipart form data to `POST /api/evidence`.
2. The API checks the session.
3. The upload must be audio or video.
4. The maximum file size is 100 MB.
5. `evidenceSchema` validates the structured fields.
6. The file is saved with a generated random name in `storage/evidence`.
7. The evidence row is inserted into MySQL.
8. The file reference is stored in `evidence.file_path_url`.
9. The MySQL trigger automatically creates the initial `REGISTERED` custody event.
10. A MongoDB `EVIDENCE_REGISTERED` event records the registration metadata.
11. The protected route `/api/evidence/files/[fileName]` serves the stored media.

The database stores the evidence metadata and path; the actual media is stored in the local evidence folder.

## 10. Chain-of-custody workflow

The chain of custody is represented by `evidence`, `chain_log`, and the `user` table.

When evidence is first created:

1. The `trg_evidence_initial_chain` trigger runs automatically.
2. It creates a `chain_log` row.
3. The handler is the user who filed the case.
4. The initial location is the evidence current location or `UNSPECIFIED`.
5. The action is `REGISTERED`.

For later movement, the stored procedure is called:

```sql
CALL sp_transfer_evidence(
  1,
  2,
  'Court Evidence Locker B',
  'Transferred for scheduled evidence review'
);
```

The procedure:

1. Starts a transaction.
2. Locks the evidence row.
3. Reads the previous location.
4. Updates the current location.
5. Inserts a `TRANSFERRED` chain-log record.
6. Commits both changes atomically.

This prevents the current location and movement history from becoming inconsistent.

## 11. Changing case status

The case list displays a status control for each case. Valid statuses are:

- `OPEN`
- `IN_PROGRESS`
- `CLOSED`
- `ARCHIVED`

When Save is selected:

1. The React `CaseActions` component sends `PATCH /api/cases/[caseId]`.
2. The API verifies the session.
3. The API validates the case ID and new status.
4. MySQL updates the case.
5. A `CASE_STATUS_CHANGED` event is written to MongoDB.
6. The page refreshes the displayed list.

Changing a case to `CLOSED` makes it appear in `/cases/solved`.

## 12. Solved cases workflow

The solved-cases page executes a filtered query against `v_case_dashboard`:

```sql
SELECT *
FROM v_case_dashboard
WHERE status = 'CLOSED'
ORDER BY filing_date DESC;
```

This means a case is not copied into a second table. It becomes a solved case by changing its status to `CLOSED`. This avoids duplicate data and keeps the case record as the single source of truth.

## 13. Deleting a case

Delete is restricted to administrators.

1. The admin selects Delete in the cases list.
2. The browser asks for confirmation.
3. The browser sends `DELETE /api/cases/[caseId]`.
4. The API verifies the session and checks for the `ADMIN` role.
5. The API collects related evidence and accused-photo filenames.
6. MySQL deletes the case.
7. Foreign-key cascade rules delete accused records, documents, hearings, evidence, and chain-log rows.
8. The related media files are removed from `storage/evidence` and `storage/accused`.
9. A `CASE_DELETED` audit event is written to MongoDB.

Deletion is intentionally not available to staff accounts. It is a destructive action and should only be demonstrated with a test case.

## 14. Database relationship workflow

The main relationships are:

- One role can belong to many users.
- One court can have many judges.
- One court can handle many cases.
- One user can file many cases.
- One case can have many accused persons.
- One case can have many documents.
- One user can upload many documents.
- One case can have many hearings.
- One case can have many evidence items.
- One evidence item can have many chain-log records.
- One user can handle many chain-log records.

The ER diagram is in `docs/er-diagram.md`, and the relational notation is in `docs/relational-schema.md`.

## 15. Validation and security

The project uses several layers of protection:

- Zod validates API input before database operations.
- MySQL constraints validate values again at the database layer.
- SQL values are passed as parameters rather than concatenated into query strings.
- Passwords are compared using bcrypt.
- Sessions use signed JWTs in HTTP-only cookies.
- Protected APIs reject unauthenticated requests.
- Case deletion checks the administrator role.
- Evidence uploads accept only audio/video MIME types and have a 100 MB limit.
- Accused photographs accept only image MIME types and have a 5 MB limit.
- Uploaded files receive generated random names to avoid trusting user-supplied filenames.
- Environment variables hold database configuration and the authentication secret.

Before real deployment, replace the local placeholder `AUTH_SECRET` with a strong random secret and change demonstration passwords.

## 16. Running the project locally

### Start services

Open Administrator PowerShell:

```powershell
Start-Service MySQL80
Start-Service MongoDB
```

Verify:

```powershell
Get-Service MySQL80,MongoDB
```

### Start the web application

```powershell
cd "C:\Users\USER\JUDICIAL-CASE-FILING-COURT-DOCKER-AND-LEGAL-CHAIN-OF-CUSTODY-SYSTEM-"
npm install
npm run dev
```

Open `http://localhost:3000`.

Local demonstration credentials are:

```text
admin@example.com / Admin123!
staff@example.com / Staff123!
```

### Run tests and production build

```powershell
npm test
npm run build
```

## 17. Suggested teacher demonstration

1. Show the project title and explain the court/evidence problem.
2. Show the ER diagram and identify primary keys and foreign keys.
3. Open the login screen and sign in as the administrator.
4. Show the dashboard totals generated from `v_case_dashboard`.
5. Create a test case with accused identity details and a photograph.
6. Register an audio/video evidence file.
7. Show that evidence creates an initial chain-log event through the trigger.
8. Demonstrate the status dropdown and change the case to `CLOSED`.
9. Open Solved cases and show that the case appears without being copied.
10. Open MySQL Workbench and run `SHOW TABLES;` and `SELECT * FROM v_case_dashboard;`.
11. Show the stored procedure for transferring evidence.
12. Show MongoDB `audit_events` containing login, case creation, evidence, and status events.
13. Explain that deletion is admin-only and demonstrate it only with a disposable test case.
14. Show the GitHub repository and the documentation files.

## 18. Important implementation scope note

The SQL schema includes `document`, `hearing`, and judge-related data for the complete relational design and dashboard reporting. The current UI/API demonstration focuses primarily on authentication, case intake, accused identity, evidence media, status management, solved cases, and deletion. If a teacher asks about a full hearing or document-upload screen, explain that those relations are present in the database design and can be extended with additional route handlers and forms.

## 19. Files to mention during viva

| File | Purpose |
|---|---|
| `db/mysql/01_schema.sql` | MySQL tables, constraints, indexes, views, trigger, procedure |
| `db/mysql/02_seed.sql` | Initial roles, users, court, case, hearing, and evidence |
| `db/mysql/03_queries.sql` | Demonstration SQL queries |
| `db/mongo/01_indexes.js` | MongoDB indexes |
| `lib/auth.ts` | Session creation, verification, and role checks |
| `lib/validation.ts` | Zod validation schemas |
| `app/api/cases/route.ts` | Case and accused creation |
| `app/api/cases/[caseId]/route.ts` | Status update and admin deletion |
| `app/api/evidence/route.ts` | Evidence metadata and media upload |
| `components/CaseActions.tsx` | Status and delete controls |
| `docs/er-diagram.md` | ER diagram |
| `docs/relational-schema.md` | Relational schema explanation |
