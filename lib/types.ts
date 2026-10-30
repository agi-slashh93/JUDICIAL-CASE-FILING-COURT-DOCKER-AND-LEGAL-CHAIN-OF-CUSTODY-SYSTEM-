export type Role = "ADMIN" | "STAFF";

export type SessionUser = {
  userId: number;
  fullName: string;
  role: Role;
};

export type CaseSummary = {
  case_id: number;
  case_number: string;
  title: string;
  case_type: string | null;
  filing_date: string;
  status: string;
  court_name: string | null;
  document_count: number;
  evidence_count: number;
  next_hearing_date: string | null;
};

export type EvidenceRecord = {
  evidence_id: number;
  case_id: number;
  evidence_code: string;
  description: string;
  type: string;
  seized_from: string | null;
  seized_date: string | null;
  current_location: string | null;
  status: string;
};
