# MongoDB data model

MongoDB stores unstructured, append-only audit events and case notes that do not belong in the normalized SQL model. Each audit event is a document with `eventType`, `caseId`, `actorId`, `payload`, and `createdAt`. Case notes contain `caseId`, `title`, `body`, `tags`, and `createdAt`.

The application writes audit events after login, case creation, evidence creation, and chain-of-custody transfers. The text index supports keyword retrieval over case notes; SQL remains the system of record for transactional case, evidence, and custody data.
