# Judicial Case Filing System — Relational Schema

Notation: `PK` = primary key, `FK` = foreign key, `UK` = unique key, `NN` = not null.

## Relations

### `role`
`ROLE(role_id PK, role_name UK NN, description)`

Allowed roles are `ADMIN` and `STAFF`.

### `user`
`USER(user_id PK, full_name NN, email UK NN, password_hash NN, phone, role_id FK→ROLE.role_id NN, status NN, created_at NN)`

`status` is `ACTIVE` or `INACTIVE`.

### `court`
`COURT(court_id PK, court_name UK NN, court_type NN, address, location)`

### `judge`
`JUDGE(judge_id PK, judge_name NN, designation NN, email UK, court_id FK→COURT.court_id NN)`

### `case`
`CASE(case_id PK, case_number UK NN, title NN, case_type NN, filing_date NN, status NN, court_id FK→COURT.court_id NN, filed_by FK→USER.user_id NN, created_at NN, updated_at NN)`

`status` is `OPEN`, `IN_PROGRESS`, `CLOSED`, or `ARCHIVED`.

### `accused_person`
`ACCUSED_PERSON(accused_id PK, case_id FK→CASE.case_id NN, full_name NN, identity_number, nationality, address, age, gender, phone, photo_path_url, created_at NN)`

The case relationship uses `ON DELETE CASCADE`. `age`, when supplied, must be between 0 and 130.

### `document`
`DOCUMENT(document_id PK, case_id FK→CASE.case_id NN, document_type NN, title NN, file_path_url, uploaded_by FK→USER.user_id NN, upload_date NN, description)`

### `hearing`
`HEARING(hearing_id PK, case_id FK→CASE.case_id NN, hearing_date NN, hearing_time, hearing_type NN, court_room, status NN, next_hearing_date)`

`status` is `SCHEDULED`, `COMPLETED`, `ADJOURNED`, or `CANCELLED`.

### `docket_entry`
`DOCKET_ENTRY(docket_entry_id PK, case_id FK→CASE.case_id NN, hearing_id FK→HEARING.hearing_id, entered_by FK→USER.user_id NN, entry_type NN, title NN, entry_text, filed_at NN)`

Stores chronological filings, court orders, proceedings, and other events for a case. A docket entry may optionally link to a hearing; deleting a hearing keeps the docket entry and clears that link. Entries are indexed by case and filing time.

### `evidence`
`EVIDENCE(evidence_id PK, case_id FK→CASE.case_id NN, evidence_code UK NN, description NN, type NN, seized_from, seized_date, current_location, file_path_url, status NN)`

`status` is `IN_CUSTODY`, `RELEASED`, `DESTROYED`, or `ADMITTED`.

### `chain_log`
`CHAIN_LOG(log_id PK, evidence_id FK→EVIDENCE.evidence_id NN, handled_by FK→USER.user_id NN, from_location, to_location NN, action NN, action_date_time NN, remarks)`

## Integrity and performance rules

- Every case belongs to one court and one filing user.
- Every evidence item belongs to one case and has a unique evidence code.
- Every docket entry belongs to a case and records the user who entered it; it can optionally reference a hearing.
- Every custody-log entry belongs to one evidence item and one handling user.
- Case deletion cascades to accused persons, documents, hearings, docket entries, evidence, and chain logs.
- The schema includes indexes for case status/date, docket chronology, evidence case/status, custody history, hearing date/status, and document full-text search.
- The `v_case_dashboard` view provides case totals and the next scheduled hearing for the application dashboard.
- The `trg_evidence_initial_chain` trigger creates the first custody event when evidence is registered.
- The `sp_transfer_evidence` procedure updates an evidence location and records the transfer atomically.

## MongoDB complement

MongoDB stores non-relational audit information in `audit_events` and case notes in `case_notes`. These collections reference the SQL case and user IDs but do not replace the normalized SQL records.
