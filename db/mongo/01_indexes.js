db = db.getSiblingDB('judicial_case_system');
db.audit_events.createIndex({ eventType: 1, createdAt: -1 });
db.audit_events.createIndex({ caseId: 1, createdAt: -1 });
db.case_notes.createIndex({ caseId: 1, createdAt: -1 });
db.case_notes.createIndex({ title: 'text', body: 'text' });
