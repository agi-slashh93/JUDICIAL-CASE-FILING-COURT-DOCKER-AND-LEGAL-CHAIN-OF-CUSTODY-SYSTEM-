USE judicial_case_system;

-- Safe migration for databases created before docket entries were added.
-- CREATE TABLE IF NOT EXISTS preserves existing cases and evidence.
CREATE TABLE IF NOT EXISTS docket_entry (
  docket_entry_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  hearing_id INT,
  entered_by INT NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  entry_text TEXT,
  filed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_docket_case FOREIGN KEY (case_id) REFERENCES `case`(case_id) ON DELETE CASCADE,
  CONSTRAINT fk_docket_hearing FOREIGN KEY (hearing_id) REFERENCES hearing(hearing_id) ON DELETE SET NULL,
  CONSTRAINT fk_docket_user FOREIGN KEY (entered_by) REFERENCES `user`(user_id),
  INDEX idx_docket_case_time (case_id, filed_at)
);
