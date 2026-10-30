USE judicial_case_system;
INSERT INTO role(role_name, description) VALUES ('ADMIN','Full case and user administration'), ('STAFF','Case, evidence and hearing operations');
INSERT INTO court(court_name, court_type, address, location) VALUES
('PES District Court','District','Bangalore District Complex','Bengaluru');
INSERT INTO `user`(full_name,email,password_hash,phone,role_id) VALUES
('System Administrator','admin@example.com','$2a$10$REPLACE_WITH_BCRYPT_HASH','0000000000',(SELECT role_id FROM role WHERE role_name='ADMIN')),
('Case Staff','staff@example.com','$2a$10$REPLACE_WITH_BCRYPT_HASH','0000000000',(SELECT role_id FROM role WHERE role_name='STAFF'));
INSERT INTO `case`(case_number,title,case_type,filing_date,status,court_id,filed_by)
VALUES('JC-2026-0001','Digital Evidence Chain Demonstration','Criminal','2026-01-15','IN_PROGRESS',1,2);
INSERT INTO hearing(case_id,hearing_date,hearing_time,hearing_type,court_room,status,next_hearing_date)
VALUES(1,'2026-11-12','10:30:00','Evidence Review','A-12','SCHEDULED','2026-11-12');
INSERT INTO evidence(case_id,evidence_code,description,type,seized_from,seized_date,current_location)
VALUES(1,'EV-0001','Encrypted storage device collected from the scene','DIGITAL','Scene Locker 4','2026-01-15','Evidence Room A');
