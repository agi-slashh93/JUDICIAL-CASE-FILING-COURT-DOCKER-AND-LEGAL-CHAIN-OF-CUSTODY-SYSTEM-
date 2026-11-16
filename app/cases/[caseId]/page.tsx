import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/mysql";
import CaseActions from "@/components/CaseActions";

type CasePageProps = { params: Promise<{ caseId: string }> };

type CaseDetails = {
  case_id: number;
  case_number: string;
  title: string;
  case_type: string;
  filing_date: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED";
  court_name: string;
  court_type: string;
  court_address: string | null;
  court_location: string | null;
  filed_by_name: string;
  filed_by_email: string;
  created_at: string;
  updated_at: string;
};

type Accused = {
  accused_id: number;
  full_name: string;
  identity_number: string | null;
  nationality: string | null;
  address: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  photo_path_url: string | null;
};

type Evidence = {
  evidence_id: number;
  evidence_code: string;
  description: string;
  type: string;
  seized_from: string | null;
  seized_date: string | null;
  current_location: string | null;
  file_path_url: string | null;
  status: string;
};

function display(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "Not scheduled";
}

export default async function CaseDetailsPage({ params }: CasePageProps) {
  if (!(await getSession())) redirect("/login");
  const caseId = Number((await params).caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) notFound();

  const [caseRows] = await pool.query(
    "SELECT c.case_id, c.case_number, c.title, c.case_type, c.filing_date, " +
    "c.status, c.created_at, c.updated_at, co.court_name, co.court_type, " +
    "co.address AS court_address, co.location AS court_location, " +
    "u.full_name AS filed_by_name, u.email AS filed_by_email " +
    "FROM `case` c JOIN court co ON co.court_id = c.court_id " +
    "JOIN `user` u ON u.user_id = c.filed_by WHERE c.case_id = ?",
    [caseId]
  );
  const details = (caseRows as CaseDetails[])[0];
  if (!details) notFound();

  const [accusedRows] = await pool.query(
    "SELECT accused_id, full_name, identity_number, nationality, address, age, gender, phone, photo_path_url " +
    "FROM accused_person WHERE case_id = ? ORDER BY accused_id",
    [caseId]
  );
  const [evidenceRows] = await pool.query(
    "SELECT evidence_id, evidence_code, description, type, seized_from, seized_date, current_location, file_path_url, status " +
    "FROM evidence WHERE case_id = ? ORDER BY evidence_id DESC",
    [caseId]
  );
  const [hearingRows] = await pool.query(
    "SELECT hearing_id, hearing_date, hearing_time, hearing_type, court_room, status, next_hearing_date " +
    "FROM hearing WHERE case_id = ? ORDER BY hearing_date DESC",
    [caseId]
  );
  const [docketRows] = await pool.query(
    "SELECT d.docket_entry_id, d.entry_type, d.title, d.entry_text, d.filed_at, " +
    "u.full_name AS entered_by_name FROM docket_entry d JOIN `user` u ON u.user_id = d.entered_by " +
    "WHERE d.case_id = ? ORDER BY d.filed_at DESC",
    [caseId]
  );
  const [documentRows] = await pool.query(
    "SELECT document_id, document_type, title, file_path_url, upload_date, description " +
    "FROM document WHERE case_id = ? ORDER BY upload_date DESC",
    [caseId]
  );

  const accused = accusedRows as Accused[];
  const evidence = evidenceRows as Evidence[];
  const hearings = hearingRows as Array<Record<string, string | number | null>>;
  const docketEntries = docketRows as Array<Record<string, string | number | null>>;
  const documents = documentRows as Array<Record<string, string | number | null>>;

  return (
    <>
      <section className="hero">
        <div>
          <div className="label">Case details · {details.case_number}</div>
          <h1>{details.title}</h1>
          <p>{details.case_type} case registered at {details.court_name}.</p>
        </div>
        <div className="detail-actions">
          <Link className="button" href="/cases">Back to cases</Link>
          <CaseActions caseId={details.case_id} status={details.status} />
        </div>
      </section>

      <section className="details-grid">
        <div className="card">
          <div className="label">Case information</div>
          <dl className="detail-list">
            <div><dt>Case number</dt><dd>{details.case_number}</dd></div>
            <div><dt>Case type</dt><dd>{details.case_type}</dd></div>
            <div><dt>Status</dt><dd className="status">{details.status}</dd></div>
            <div><dt>Filing date</dt><dd>{formatDate(details.filing_date)}</dd></div>
            <div><dt>Filed by</dt><dd>{details.filed_by_name} ({details.filed_by_email})</dd></div>
            <div><dt>Created</dt><dd>{formatDate(details.created_at)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(details.updated_at)}</dd></div>
          </dl>
        </div>
        <div className="card">
          <div className="label">Court information</div>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{details.court_name}</dd></div>
            <div><dt>Type</dt><dd>{details.court_type}</dd></div>
            <div><dt>Address</dt><dd>{display(details.court_address)}</dd></div>
            <div><dt>Location</dt><dd>{display(details.court_location)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="card detail-section">
        <div className="topbar"><div><div className="label">Accused parties</div><h2>Identity details</h2></div><span className="label">{accused.length} record(s)</span></div>
        {accused.length === 0 ? <p>No accused details have been registered for this case.</p> : <div className="people-grid">{accused.map((person) => <article className="person-card" key={person.accused_id}>
          {person.photo_path_url ? <img className="accused-photo" src={"/api/accused/photos/" + encodeURIComponent(person.photo_path_url)} alt={"Photo of " + person.full_name} /> : <div className="photo-placeholder">No photo</div>}
          <div><h3>{person.full_name}</h3><dl className="detail-list compact">
            <div><dt>Identity number</dt><dd>{display(person.identity_number)}</dd></div>
            <div><dt>Nationality</dt><dd>{display(person.nationality)}</dd></div>
            <div><dt>Age / gender</dt><dd>{display(person.age)} / {display(person.gender)}</dd></div>
            <div><dt>Address</dt><dd>{display(person.address)}</dd></div>
            <div><dt>Phone</dt><dd>{display(person.phone)}</dd></div>
          </dl></div>
        </article>)}</div>}
      </section>

      <section className="two detail-section">
        <div className="card"><div className="topbar"><div><div className="label">Evidence register</div><h2>Evidence</h2></div><span className="label">{evidence.length} item(s)</span></div>
          {evidence.length === 0 ? <p>No evidence has been registered.</p> : <div className="stack">{evidence.map((item) => <article className="list-item" key={item.evidence_id}><div><strong>{item.evidence_code}</strong><p>{item.description}</p><small>{item.type} · {item.status} · Current location: {display(item.current_location)}</small></div>{item.file_path_url ? <Link className="button" href={"/api/evidence/files/" + encodeURIComponent(item.file_path_url)} target="_blank">Open media</Link> : null}</article>)}</div>}
        </div>
        <div className="card"><div className="topbar"><div><div className="label">Court schedule</div><h2>Hearings</h2></div><span className="label">{hearings.length}</span></div>
          {hearings.length === 0 ? <p>No hearings have been scheduled.</p> : <div className="stack">{hearings.map((hearing) => <article className="list-item" key={String(hearing.hearing_id)}><div><strong>{display(hearing.hearing_type)}</strong><p>{formatDate(String(hearing.hearing_date))} {display(hearing.hearing_time)} · Room {display(hearing.court_room)}</p><small>{display(hearing.status)} · Next: {formatDate(hearing.next_hearing_date ? String(hearing.next_hearing_date) : null)}</small></div></article>)}</div>}
        </div>
      </section>

      <section className="two detail-section">
        <div className="card"><div className="topbar"><div><div className="label">Docket history</div><h2>Entries</h2></div><span className="label">{docketEntries.length}</span></div>
          {docketEntries.length === 0 ? <p>No docket entries have been recorded.</p> : <div className="stack">{docketEntries.map((entry) => <article className="list-item" key={String(entry.docket_entry_id)}><div><strong>{display(entry.title)}</strong><p>{display(entry.entry_text)}</p><small>{display(entry.entry_type)} · {formatDate(String(entry.filed_at))} · {display(entry.entered_by_name)}</small></div></article>)}</div>}
        </div>
        <div className="card"><div className="topbar"><div><div className="label">Filed records</div><h2>Documents</h2></div><span className="label">{documents.length}</span></div>
          {documents.length === 0 ? <p>No documents have been filed.</p> : <div className="stack">{documents.map((document) => <article className="list-item" key={String(document.document_id)}><div><strong>{display(document.title)}</strong><p>{display(document.description)}</p><small>{display(document.document_type)} · {formatDate(String(document.upload_date))}</small></div>{document.file_path_url ? <Link className="button" href={String(document.file_path_url)} target="_blank">Open file</Link> : null}</article>)}</div>}
        </div>
      </section>
    </>
  );
}
