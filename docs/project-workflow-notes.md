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
3. The upload must be an image, audio, or video file.
4. The maximum file size is 100 MB.
5. `evidenceSchema` validates the structured fields.
6. The file is saved with a generated random name in `storage/evidence`.
7. The evidence row is inserted into MySQL.
8. The file reference is stored in `evidence.file_path_url`.
9. The MySQL trigger automatically creates the initial `REGISTERED` custody event.
10. A MongoDB `EVIDENCE_REGISTERED` event records the registration metadata.
11. The protected route `/api/evidence/files/[fileName]` serves the stored media.

The database stores the evidence metadata and path; the actual media is stored in the local evidence folder. Each evidence code now links to an evidence-details page that can preview images, play supported audio/video files, and display the complete custody history.

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

## 20. Databases used in the project

### MySQL 8 — relational database

MySQL is the primary database. It stores the data that must be structured, validated, joined, and updated transactionally:

- Users and roles.
- Courts and judges.
- Court cases.
- Accused-person identity data.
- Documents.
- Hearings.
- Docket entries.
- Evidence metadata.
- Chain-of-custody events.

The local database connection is configured through `.env`:

```text
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=judicial_case_system
MYSQL_USER=case_app
MYSQL_PASSWORD=change_me
```

The physical MySQL data files are stored by the MySQL installation under:

```text
C:\ProgramData\MySQL\MySQL Server 8.0\Data
```

The application connects using the `mysql2/promise` connection pool in `lib/mysql.ts`. A pool is used instead of opening a new database connection for every request.

### MongoDB — document database

MongoDB is the second database paradigm. It stores flexible and append-only information:

- `audit_events`: login, case creation, evidence registration, case status changes, and case deletion.
- `case_notes`: future or flexible case notes with title, body, tags, and timestamps.

The local MongoDB configuration is:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=judicial_case_system
```

MongoDB files are stored under the installed MongoDB data directory, while the project setup scripts are in `db/mongo`.

The application writes audit events through `lib/mongo.ts`. Every event contains an event type, actor, optional case reference, payload, and `createdAt` timestamp.

### File storage

Files are not stored directly inside MySQL or MongoDB:

- Accused photographs: `storage/accused`.
- Audio/video evidence: `storage/evidence`.

The SQL tables store generated filenames in `photo_path_url` and `file_path_url`. Protected Next.js routes serve those files.

## 21. Complete MySQL DDL explanation

DDL means Data Definition Language. It defines and changes database structures. This project uses the following DDL operations in `db/mysql/01_schema.sql`.

### Database creation and selection

```sql
CREATE DATABASE IF NOT EXISTS judicial_case_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE judicial_case_system;
```

`utf8mb4` supports international text, and the `0900_ai_ci` collation provides case-insensitive comparisons suitable for names and titles.

### Safe recreation during development

```sql
DROP VIEW IF EXISTS v_case_dashboard, v_user_roles;
DROP TABLE IF EXISTS chain_log, evidence, docket_entry, hearing,
  document, `case`, judge, court, `user`, role;
```

This makes the schema script repeatable during development. It should not be executed on a production database containing important records because it removes the tables and data.

### Table creation

The project creates eleven normalized tables:

1. `role` — administrator and staff role definitions.
2. `user` — authenticated personnel.
3. `court` — court information.
4. `judge` — judges assigned to courts.
5. `case` — central case record.
6. `accused_person` — accused identity and photo reference.
7. `document` — case documents and metadata.
8. `hearing` — scheduled court hearings.
9. `docket_entry` — filings, orders, proceedings, and case events.
10. `evidence` — evidence metadata and current location.
11. `chain_log` — immutable custody movement history.

### Keys and constraints

The schema demonstrates:

- `PRIMARY KEY`: unique row identity, for example `case_id`.
- `AUTO_INCREMENT`: generates numeric identifiers.
- `UNIQUE`: prevents duplicates, for example case numbers, emails, court names, and evidence codes.
- `NOT NULL`: requires important values.
- `DEFAULT`: supplies values such as `OPEN`, `ACTIVE`, and current timestamps.
- `FOREIGN KEY`: preserves relationships between tables.
- `CHECK`: restricts legal domain values.
- `ON DELETE CASCADE`: removes dependent case records when a case is deleted.
- `ON DELETE SET NULL`: keeps a docket entry if its optional hearing is removed.

Examples of domain checks:

```sql
CHECK (role_name IN ('ADMIN','STAFF'))
CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED','ARCHIVED'))
CHECK (age IS NULL OR age BETWEEN 0 AND 130)
CHECK (status IN ('IN_CUSTODY','RELEASED','DESTROYED','ADMITTED'))
```

### `ALTER TABLE`

The schema adds a full-text index after creating the document table:

```sql
ALTER TABLE document
  ADD FULLTEXT INDEX ft_document_text (title, description);
```

This permits keyword search over document metadata.

### Indexes

```sql
CREATE INDEX idx_case_status_filing
  ON `case` (status, filing_date);

CREATE INDEX idx_evidence_case_status
  ON evidence (case_id, status);

CREATE INDEX idx_chain_evidence_time
  ON chain_log (evidence_id, action_date_time DESC);

CREATE INDEX idx_hearing_date_status
  ON hearing (hearing_date, status);
```

Indexes improve common filters and sorting. For example, the solved-cases page filters by `status`, and custody history is normally displayed by evidence and time.

### Views

The user-role view joins users and roles for authentication:

```sql
CREATE OR REPLACE VIEW v_user_roles AS
SELECT u.user_id, u.full_name, u.email, u.password_hash,
       u.status, r.role_name
FROM `user` u
JOIN role r ON r.role_id = u.role_id;
```

The dashboard view combines case, court, document, evidence, and hearing information:

```sql
CREATE OR REPLACE VIEW v_case_dashboard AS
SELECT c.case_id, c.case_number, c.title, c.case_type,
       c.filing_date, c.status, co.court_name,
       COUNT(DISTINCT d.document_id) AS document_count,
       COUNT(DISTINCT e.evidence_id) AS evidence_count,
       MIN(h.next_hearing_date) AS next_hearing_date
FROM `case` c
LEFT JOIN court co ON co.court_id = c.court_id
LEFT JOIN document d ON d.case_id = c.case_id
LEFT JOIN evidence e ON e.case_id = c.case_id
LEFT JOIN hearing h ON h.case_id = c.case_id
                    AND h.status = 'SCHEDULED'
GROUP BY c.case_id, c.case_number, c.title, c.case_type,
         c.filing_date, c.status, co.court_name;
```

The view prevents every page from repeating the same joins and aggregation logic.

### Trigger

The trigger automatically records the first custody event:

```sql
CREATE TRIGGER trg_evidence_initial_chain
AFTER INSERT ON evidence
FOR EACH ROW
BEGIN
  INSERT INTO chain_log
    (evidence_id, handled_by, to_location, action, remarks)
  VALUES
    (NEW.evidence_id,
     (SELECT filed_by FROM `case` WHERE case_id = NEW.case_id),
     COALESCE(NEW.current_location, 'UNSPECIFIED'),
     'REGISTERED',
     'Initial chain-of-custody event');
END;
```

This guarantees that every newly registered evidence item begins with a custody history entry, even if the application code does not separately insert one.

### Stored procedure and transaction

```sql
CREATE PROCEDURE sp_transfer_evidence(
  IN p_evidence_id INT,
  IN p_user_id INT,
  IN p_to_location VARCHAR(150),
  IN p_remarks TEXT
)
BEGIN
  DECLARE old_location VARCHAR(150);
  START TRANSACTION;
  SELECT current_location INTO old_location
  FROM evidence
  WHERE evidence_id = p_evidence_id
  FOR UPDATE;
  IF old_location IS NULL THEN
    SET old_location = 'UNSPECIFIED';
  END IF;
  UPDATE evidence
  SET current_location = p_to_location
  WHERE evidence_id = p_evidence_id;
  INSERT INTO chain_log
    (evidence_id, handled_by, from_location, to_location, action, remarks)
  VALUES
    (p_evidence_id, p_user_id, old_location, p_to_location,
     'TRANSFERRED', p_remarks);
  COMMIT;
END;
```

The transaction makes the location update and history insert one atomic operation. `FOR UPDATE` locks the selected evidence row while the transfer is being processed.

## 22. Complete MySQL DML explanation

DML means Data Manipulation Language. It inserts, reads, updates, and deletes records.

### Insert seed data

The seed file inserts roles:

```sql
INSERT INTO role(role_name, description)
VALUES
  ('ADMIN', 'Full case and user administration'),
  ('STAFF', 'Case, evidence and hearing operations');
```

It inserts a court:

```sql
INSERT INTO court(court_name, court_type, address, location)
VALUES
  ('PES District Court', 'District',
   'Bangalore District Complex', 'Bengaluru');
```

It inserts users and obtains the role ID through a subquery:

```sql
INSERT INTO `user`
  (full_name, email, password_hash, phone, role_id)
VALUES
  ('System Administrator', 'admin@example.com',
   '<bcrypt hash>', '0000000000',
   (SELECT role_id FROM role WHERE role_name = 'ADMIN'));
```

It inserts the demonstration case, hearing, and evidence. Inserting evidence also invokes the custody trigger.

### Application inserts

The web API performs parameterized inserts rather than building SQL with string concatenation:

- Case API inserts a row into `case`.
- Case API inserts a row into `accused_person`.
- Evidence API inserts a row into `evidence`.
- The trigger inserts the first `chain_log` row.

The case and accused inserts occur inside a transaction, so a case cannot be committed without its required accused record and photo reference.

### Application updates

The status control sends a `PATCH` request, which executes:

```sql
UPDATE `case`
SET status = ?
WHERE case_id = ?;
```

The stored procedure updates evidence location and creates the matching custody event.

### Application deletes

Only an administrator can delete a case. The API executes:

```sql
DELETE FROM `case`
WHERE case_id = ?;
```

The foreign-key cascade deletes dependent relational data. The API then deletes the corresponding stored media files and writes a MongoDB audit event.

## 23. Query-by-query explanation of `03_queries.sql`

### Query 1 — dashboard view, ordering, and aggregation

```sql
SELECT *
FROM v_case_dashboard
ORDER BY filing_date DESC;
```

This retrieves the dashboard-ready result and displays newest filings first.

### Query 2 — evidence movement using joins and filtering

```sql
SELECT e.evidence_code, c.case_number,
       cl.from_location, cl.to_location,
       cl.action_date_time
FROM evidence e
JOIN `case` c ON c.case_id = e.case_id
JOIN chain_log cl ON cl.evidence_id = e.evidence_id
WHERE cl.from_location IS NOT NULL
  AND cl.from_location <> cl.to_location
ORDER BY cl.action_date_time DESC;
```

This identifies custody movements where the evidence changed location.

### Query 3 — scheduled hearings with `GROUP BY` and `HAVING`

```sql
SELECT c.case_number, c.title,
       COUNT(h.hearing_id) AS scheduled_hearings
FROM `case` c
JOIN hearing h ON h.case_id = c.case_id
             AND h.status = 'SCHEDULED'
GROUP BY c.case_id, c.case_number, c.title
HAVING COUNT(h.hearing_id) >= 1
ORDER BY MIN(h.hearing_date);
```

This groups hearings by case, removes groups with no scheduled hearing, and orders cases by their earliest hearing.

### Query 4 — full-text search

```sql
SELECT document_id, title,
       MATCH(title, description)
       AGAINST('+evidence' IN BOOLEAN MODE) AS relevance
FROM document
WHERE MATCH(title, description)
      AGAINST('+evidence' IN BOOLEAN MODE)
ORDER BY relevance DESC;
```

The `+` requires the word `evidence`, while the full-text index avoids a slow scan of every document description.

### Query 5 — subquery and average comparison

```sql
SELECT court_name, case_count
FROM (
  SELECT co.court_name, COUNT(c.case_id) AS case_count
  FROM court co
  LEFT JOIN `case` c ON c.court_id = co.court_id
  GROUP BY co.court_id, co.court_name
) x
WHERE case_count > (
  SELECT AVG(case_count)
  FROM (
    SELECT COUNT(*) AS case_count
    FROM `case`
    GROUP BY court_id
  ) y
);
```

This uses nested subqueries to find courts whose number of cases is above the average case count.

### Useful demonstration commands

```sql
USE judicial_case_system;
SHOW TABLES;
DESCRIBE `case`;
SHOW CREATE VIEW v_case_dashboard;
SELECT * FROM v_case_dashboard;
SELECT * FROM chain_log ORDER BY action_date_time DESC;
SELECT * FROM docket_entry ORDER BY filed_at DESC;
```

## 24. MongoDB commands used

The MongoDB setup selects the project database:

```javascript
db = db.getSiblingDB('judicial_case_system');
```

It creates indexes for audit-event retrieval:

```javascript
db.audit_events.createIndex({ eventType: 1, createdAt: -1 });
db.audit_events.createIndex({ caseId: 1, createdAt: -1 });
```

It creates indexes for case notes and text search:

```javascript
db.case_notes.createIndex({ caseId: 1, createdAt: -1 });
db.case_notes.createIndex({ title: 'text', body: 'text' });
```

Useful demonstration commands:

```javascript
use judicial_case_system
show collections
db.audit_events.find().sort({ createdAt: -1 }).limit(10)
db.audit_events.countDocuments()
db.case_notes.find({ $text: { $search: 'evidence' } })
```

## 25. Complete application API map

| Method | Route | Purpose | Database effect |
|---|---|---|---|
| `POST` | `/api/auth/login` | Verify credentials and create session | Reads MySQL; writes Mongo audit |
| `POST` | `/api/auth/logout` | End session | Clears cookie |
| `GET` | `/api/cases` | Retrieve dashboard cases | Reads `v_case_dashboard` |
| `POST` | `/api/cases` | Create case and accused person | MySQL transaction, file write, Mongo audit |
| `PATCH` | `/api/cases/[caseId]` | Change case status | Updates MySQL; writes Mongo audit |
| `DELETE` | `/api/cases/[caseId]` | Delete case, admin only | Cascading MySQL delete, media deletion, Mongo audit |
| `GET` | `/api/evidence` | List evidence | Reads MySQL |
| `POST` | `/api/evidence` | Register evidence media | MySQL insert, file write, trigger, Mongo audit |
| `GET` | `/api/evidence/files/[fileName]` | Serve protected evidence media | Reads local storage |
| `GET` | `/api/accused/photos/[fileName]` | Serve protected accused photo | Reads local storage |
| `GET/POST` | `/api/admin/users` | Administrative user operations | Reads/writes MySQL with role checks |

## 26. Exact setup and execution commands

### First-time setup

```powershell
cd "C:\Users\USER\JUDICIAL-CASE-FILING-COURT-DOCKER-AND-LEGAL-CHAIN-OF-CUSTODY-SYSTEM-"
Copy-Item .env.example .env
npm.cmd install
```

Load MySQL schema and seed data only when the database is not already initialized:

```powershell
mysql -u root -p < db\mysql\01_schema.sql
mysql -u root -p < db\mysql\02_seed.sql
mongosh < db\mongo\01_indexes.js
```

### Every normal run

In Administrator PowerShell:

```powershell
Start-Service MongoDB
```

MySQL must be listening on port `3306`:

```powershell
Get-NetTCPConnection -LocalPort 3306
```

Then in the project terminal:

```powershell
cd "C:\Users\USER\JUDICIAL-CASE-FILING-COURT-DOCKER-AND-LEGAL-CHAIN-OF-CUSTODY-SYSTEM-"
npm.cmd run dev
```

Open `http://localhost:3000`.

The `npm.cmd` form is useful on Windows when PowerShell execution policy blocks `npm.ps1`.

### Verification commands

```powershell
Get-Service MongoDB
Get-NetTCPConnection -LocalPort 3306
Test-NetConnection 127.0.0.1 -Port 27017
npm.cmd test
npm.cmd run build
```

## 27. Database presentation checklist

For a teacher demonstration, explain the database in this order:

1. MySQL is the primary normalized relational database.
2. MongoDB is the second paradigm for flexible audit documents and notes.
3. The `case` table is the central entity.
4. Foreign keys connect cases to courts, users, accused people, hearings, docket entries, documents, and evidence.
5. `chain_log` preserves evidence movement history.
6. `v_case_dashboard` simplifies reporting.
7. The trigger automatically registers initial custody.
8. The stored procedure transfers evidence atomically.
9. Constraints enforce valid roles, statuses, dates, and age.
10. Indexes improve dashboard, hearing, custody, and full-text search performance.
11. API operations use parameterized SQL and validation.
12. MongoDB records who performed important actions and when.

## 28. Short viva answers

**Why did you use two databases?** MySQL is best for structured relationships and transactions; MongoDB is useful for flexible, append-only audit events and notes.

**What is the primary key of the case table?** `case_id`. `case_number` is also unique and is the human-readable case identifier.

**Why is chain of custody a separate table?** One evidence item can move many times, so each movement must be stored as a separate historical row.

**What does the trigger do?** It creates the initial `REGISTERED` custody event automatically whenever evidence is inserted.

**What does the stored procedure do?** It updates the evidence location and inserts the corresponding transfer log inside one transaction.

**How are solved cases identified?** A case is considered solved when its status is `CLOSED`; the solved page filters the dashboard view rather than copying records.

**Who can delete a case?** Only an authenticated administrator. Dependent rows and stored media are removed, and the deletion is audited in MongoDB.

**How are passwords protected?** Passwords are stored as bcrypt hashes and verified on the server. Sessions use signed, HTTP-only cookies.

**What happens if case intake fails halfway through?** The MySQL transaction rolls back, so the case and accused row are not committed as a partial pair.
