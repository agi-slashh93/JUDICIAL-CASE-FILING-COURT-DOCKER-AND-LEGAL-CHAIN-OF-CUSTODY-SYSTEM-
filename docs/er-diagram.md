# Judicial Case Filing System — ER Diagram

The diagram below represents the transactional MySQL database. MongoDB is used separately for append-only audit events and case notes, so it is not part of this relational ER model.

```mermaid
erDiagram
    ROLE ||--o{ USER : assigns
    USER ||--o{ CASE : files
    COURT ||--o{ JUDGE : has
    COURT ||--o{ CASE : handles
    CASE ||--o{ ACCUSED_PERSON : has
    CASE ||--o{ DOCUMENT : contains
    USER ||--o{ DOCUMENT : uploads
    CASE ||--o{ HEARING : schedules
    CASE ||--o{ DOCKET_ENTRY : records
    HEARING o|--o{ DOCKET_ENTRY : relates_to
    USER ||--o{ DOCKET_ENTRY : enters
    CASE ||--o{ EVIDENCE : registers
    EVIDENCE ||--o{ CHAIN_LOG : records
    USER ||--o{ CHAIN_LOG : handles

    ROLE {
        int role_id PK
        varchar role_name UK
        varchar description
    }
    USER {
        int user_id PK
        varchar full_name
        varchar email UK
        varchar password_hash
        varchar phone
        int role_id FK
        varchar status
        timestamp created_at
    }
    COURT {
        int court_id PK
        varchar court_name UK
        varchar court_type
        varchar address
        varchar location
    }
    JUDGE {
        int judge_id PK
        varchar judge_name
        varchar designation
        varchar email UK
        int court_id FK
    }
    CASE {
        int case_id PK
        varchar case_number UK
        varchar title
        varchar case_type
        date filing_date
        varchar status
        int court_id FK
        int filed_by FK
        timestamp created_at
        timestamp updated_at
    }
    ACCUSED_PERSON {
        int accused_id PK
        int case_id FK
        varchar full_name
        varchar identity_number
        varchar nationality
        varchar address
        tinyint age
        varchar gender
        varchar phone
        varchar photo_path_url
        timestamp created_at
    }
    DOCUMENT {
        int document_id PK
        int case_id FK
        varchar document_type
        varchar title
        varchar file_path_url
        int uploaded_by FK
        datetime upload_date
        text description
    }
    HEARING {
        int hearing_id PK
        int case_id FK
        date hearing_date
        time hearing_time
        varchar hearing_type
        varchar court_room
        varchar status
        date next_hearing_date
    }
    DOCKET_ENTRY {
        int docket_entry_id PK
        int case_id FK
        int hearing_id FK
        int entered_by FK
        varchar entry_type
        varchar title
        text entry_text
        datetime filed_at
    }
    EVIDENCE {
        int evidence_id PK
        int case_id FK
        varchar evidence_code UK
        text description
        varchar type
        varchar seized_from
        date seized_date
        varchar current_location
        varchar file_path_url
        varchar status
    }
    CHAIN_LOG {
        int log_id PK
        int evidence_id FK
        int handled_by FK
        varchar from_location
        varchar to_location
        varchar action
        datetime action_date_time
        text remarks
    }
```

## Relationship summary

| Parent | Child | Cardinality | Foreign key |
|---|---|---:|---|
| `role` | `user` | 1 : many | `user.role_id` |
| `user` | `case` | 1 : many | `case.filed_by` |
| `court` | `judge` | 1 : many | `judge.court_id` |
| `court` | `case` | 1 : many | `case.court_id` |
| `case` | `accused_person` | 1 : many | `accused_person.case_id` |
| `case` | `document` | 1 : many | `document.case_id` |
| `user` | `document` | 1 : many | `document.uploaded_by` |
| `case` | `hearing` | 1 : many | `hearing.case_id` |
| `case` | `docket_entry` | 1 : many | `docket_entry.case_id` |
| `hearing` | `docket_entry` | 1 : many (optional on entry) | `docket_entry.hearing_id` |
| `user` | `docket_entry` | 1 : many | `docket_entry.entered_by` |
| `case` | `evidence` | 1 : many | `evidence.case_id` |
| `evidence` | `chain_log` | 1 : many | `chain_log.evidence_id` |
| `user` | `chain_log` | 1 : many | `chain_log.handled_by` |

The `case` table is the central entity. Deleting a case cascades to its accused records, documents, hearings, docket entries, evidence, and chain-of-custody logs according to the schema constraints.
