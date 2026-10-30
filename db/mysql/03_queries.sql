USE judicial_case_system;

-- Dashboard query with JOIN, aggregation and ordering.
SELECT * FROM v_case_dashboard ORDER BY filing_date DESC;

-- Evidence currently outside its initial location.
SELECT e.evidence_code, c.case_number, cl.from_location, cl.to_location, cl.action_date_time
FROM evidence e JOIN `case` c ON c.case_id=e.case_id
JOIN chain_log cl ON cl.evidence_id=e.evidence_id
WHERE cl.from_location IS NOT NULL AND cl.from_location <> cl.to_location
ORDER BY cl.action_date_time DESC;

-- Cases with at least one scheduled hearing.
SELECT c.case_number, c.title, COUNT(h.hearing_id) AS scheduled_hearings
FROM `case` c JOIN hearing h ON h.case_id=c.case_id AND h.status='SCHEDULED'
GROUP BY c.case_id, c.case_number, c.title HAVING COUNT(h.hearing_id) >= 1
ORDER BY MIN(h.hearing_date);

-- Full-text search across document metadata.
SELECT document_id, title, MATCH(title, description) AGAINST('+evidence' IN BOOLEAN MODE) AS relevance
FROM document WHERE MATCH(title, description) AGAINST('+evidence' IN BOOLEAN MODE)
ORDER BY relevance DESC;

-- Subquery: courts whose case count exceeds the average court case count.
SELECT court_name, case_count FROM (
  SELECT co.court_name, COUNT(c.case_id) AS case_count
  FROM court co LEFT JOIN `case` c ON c.court_id=co.court_id
  GROUP BY co.court_id, co.court_name
) x WHERE case_count > (SELECT AVG(case_count) FROM (
  SELECT COUNT(*) AS case_count FROM `case` GROUP BY court_id
) y);
