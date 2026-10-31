CREATE DATABASE IF NOT EXISTS judicial_case_system CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE judicial_case_system;

DROP VIEW IF EXISTS v_case_dashboard, v_user_roles;
DROP TABLE IF EXISTS chain_log, evidence, hearing, document, `case`, judge, court, `user`, role;

CREATE TABLE role (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  CONSTRAINT chk_role_name CHECK (role_name IN ('ADMIN','STAFF'))
);

CREATE TABLE `user` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES role(role_id),
  CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE court (
  court_id INT AUTO_INCREMENT PRIMARY KEY,
  court_name VARCHAR(150) NOT NULL,
  court_type VARCHAR(50) NOT NULL,
  address VARCHAR(255),
  location VARCHAR(100),
  UNIQUE KEY uq_court_name (court_name)
);

CREATE TABLE judge (
  judge_id INT AUTO_INCREMENT PRIMARY KEY,
  judge_name VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE,
  court_id INT NOT NULL,
  CONSTRAINT fk_judge_court FOREIGN KEY (court_id) REFERENCES court(court_id)
);

CREATE TABLE `case` (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  case_type VARCHAR(100) NOT NULL,
  filing_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  court_id INT NOT NULL,
  filed_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_court FOREIGN KEY (court_id) REFERENCES court(court_id),
  CONSTRAINT fk_case_user FOREIGN KEY (filed_by) REFERENCES `user`(user_id),
  CONSTRAINT chk_case_status CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED','ARCHIVED')),
  CONSTRAINT chk_case_filing_date CHECK (filing_date >= '1900-01-01')
);

CREATE TABLE document (
  document_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_path_url VARCHAR(500),
  uploaded_by INT NOT NULL,
  upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  CONSTRAINT fk_document_case FOREIGN KEY (case_id) REFERENCES `case`(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_document_user FOREIGN KEY (uploaded_by) REFERENCES `user`(user_id)
);

CREATE TABLE hearing (
  hearing_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  hearing_date DATE NOT NULL,
  hearing_time TIME,
  hearing_type VARCHAR(100) NOT NULL,
  court_room VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
  next_hearing_date DATE,
  CONSTRAINT fk_hearing_case FOREIGN KEY (case_id) REFERENCES `case`(case_id) ON DELETE CASCADE,
  CONSTRAINT chk_hearing_status CHECK (status IN ('SCHEDULED','COMPLETED','ADJOURNED','CANCELLED'))
);

CREATE TABLE evidence (
  evidence_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  evidence_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  seized_from VARCHAR(150),
  seized_date DATE,
  current_location VARCHAR(150),
  file_path_url VARCHAR(500),
  status VARCHAR(30) NOT NULL DEFAULT 'IN_CUSTODY',
  CONSTRAINT fk_evidence_case FOREIGN KEY (case_id) REFERENCES `case`(case_id) ON DELETE CASCADE,
  CONSTRAINT chk_evidence_status CHECK (status IN ('IN_CUSTODY','RELEASED','DESTROYED','ADMITTED'))
);

CREATE TABLE chain_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  evidence_id INT NOT NULL,
  handled_by INT NOT NULL,
  from_location VARCHAR(150),
  to_location VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  action_date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  CONSTRAINT fk_chain_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id) ON DELETE CASCADE,
  CONSTRAINT fk_chain_user FOREIGN KEY (handled_by) REFERENCES `user`(user_id)
);

CREATE INDEX idx_case_status_filing ON `case` (status, filing_date);
CREATE INDEX idx_evidence_case_status ON evidence (case_id, status);
CREATE INDEX idx_chain_evidence_time ON chain_log (evidence_id, action_date_time DESC);
CREATE INDEX idx_hearing_date_status ON hearing (hearing_date, status);
ALTER TABLE document ADD FULLTEXT INDEX ft_document_text (title, description);

CREATE OR REPLACE VIEW v_user_roles AS
SELECT u.user_id, u.full_name, u.email, u.password_hash, u.status, r.role_name
FROM `user` u JOIN role r ON r.role_id = u.role_id;

CREATE OR REPLACE VIEW v_case_dashboard AS
SELECT c.case_id, c.case_number, c.title, c.case_type, c.filing_date, c.status,
       co.court_name,
       COUNT(DISTINCT d.document_id) AS document_count,
       COUNT(DISTINCT e.evidence_id) AS evidence_count,
       MIN(h.next_hearing_date) AS next_hearing_date
FROM `case` c
LEFT JOIN court co ON co.court_id = c.court_id
LEFT JOIN document d ON d.case_id = c.case_id
LEFT JOIN evidence e ON e.case_id = c.case_id
LEFT JOIN hearing h ON h.case_id = c.case_id AND h.status = 'SCHEDULED'
GROUP BY c.case_id, c.case_number, c.title, c.case_type, c.filing_date, c.status, co.court_name;

DELIMITER //
CREATE TRIGGER trg_evidence_initial_chain
AFTER INSERT ON evidence
FOR EACH ROW
BEGIN
  INSERT INTO chain_log (evidence_id, handled_by, to_location, action, remarks)
  VALUES (NEW.evidence_id, (SELECT filed_by FROM `case` WHERE case_id = NEW.case_id),
          COALESCE(NEW.current_location, 'UNSPECIFIED'), 'REGISTERED', 'Initial chain-of-custody event');
END//

CREATE PROCEDURE sp_transfer_evidence(
  IN p_evidence_id INT, IN p_user_id INT, IN p_to_location VARCHAR(150), IN p_remarks TEXT
)
BEGIN
  DECLARE old_location VARCHAR(150);
  START TRANSACTION;
  SELECT current_location INTO old_location FROM evidence WHERE evidence_id = p_evidence_id FOR UPDATE;
  IF old_location IS NULL THEN SET old_location = 'UNSPECIFIED'; END IF;
  UPDATE evidence SET current_location = p_to_location WHERE evidence_id = p_evidence_id;
  INSERT INTO chain_log(evidence_id, handled_by, from_location, to_location, action, remarks)
  VALUES(p_evidence_id, p_user_id, old_location, p_to_location, 'TRANSFERRED', p_remarks);
  COMMIT;
END//
DELIMITER ;
