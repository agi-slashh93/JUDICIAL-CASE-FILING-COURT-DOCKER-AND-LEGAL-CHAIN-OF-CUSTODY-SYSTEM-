import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/mysql";

type Props = { params: Promise<{ evidenceId: string }> };

type EvidenceDetails = {
  evidence_id: number;
  case_id: number;
  case_number: string;
  case_title: string;
  evidence_code: string;
  description: string;
  type: string;
  seized_from: string | null;
  seized_date: string | null;
  current_location: string | null;
  file_path_url: string | null;
  status: string;
};

function value(input: string | null | undefined) {
  return input || "Not provided";
}

function date(input: string | null | undefined) {
  return input ? new Date(input).toLocaleDateString("en-IN") : "Not provided";
}

function extension(input: string) {
  return input.slice(input.lastIndexOf(".")).toLowerCase();
}

export default async function EvidenceDetailsPage({ params }: Props) {
  if (!(await getSession())) redirect("/login");
  const evidenceId = Number((await params).evidenceId);
  if (!Number.isInteger(evidenceId) || evidenceId <= 0) notFound();

  const [rows] = await pool.query(
    "SELECT e.evidence_id, e.case_id, c.case_number, c.title AS case_title, " +
    "e.evidence_code, e.description, e.type, e.seized_from, e.seized_date, " +
    "e.current_location, e.file_path_url, e.status " +
    "FROM evidence e JOIN `case` c ON c.case_id = e.case_id " +
    "WHERE e.evidence_id = ?",
    [evidenceId]
  );
  const evidence = (rows as EvidenceDetails[])[0];
  if (!evidence) notFound();

  const [logRows] = await pool.query(
    "SELECT cl.log_id, cl.from_location, cl.to_location, cl.action, " +
    "cl.action_date_time, cl.remarks, u.full_name AS handled_by_name " +
    "FROM chain_log cl JOIN `user` u ON u.user_id = cl.handled_by " +
    "WHERE cl.evidence_id = ? ORDER BY cl.action_date_time DESC",
    [evidenceId]
  );
  const logs = logRows as Array<Record<string, string | number | null>>;
  const mediaUrl = evidence.file_path_url ? "/api/evidence/files/" + encodeURIComponent(evidence.file_path_url) : null;
  const mediaExtension = evidence.file_path_url ? extension(evidence.file_path_url) : "";
  const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(mediaExtension);
  const isAudio = [".mp3", ".wav", ".m4a", ".ogg"].includes(mediaExtension);
  const isVideo = [".mp4", ".webm", ".mov"].includes(mediaExtension);

  return (
    <>
      <section className="hero">
        <div>
          <div className="label">Evidence details · {evidence.evidence_code}</div>
          <h1>{evidence.evidence_code}</h1>
          <p>Registered against <Link className="status" href={"/cases/" + evidence.case_id}>{evidence.case_number}</Link> · {evidence.case_title}</p>
        </div>
        <Link className="button" href={"/cases/" + evidence.case_id}>Back to case</Link>
      </section>

      <section className="details-grid">
        <div className="card">
          <div className="label">Evidence information</div>
          <dl className="detail-list">
            <div><dt>Description</dt><dd>{evidence.description}</dd></div>
            <div><dt>Type</dt><dd>{evidence.type}</dd></div>
            <div><dt>Status</dt><dd className="status">{evidence.status}</dd></div>
            <div><dt>Seized from</dt><dd>{value(evidence.seized_from)}</dd></div>
            <div><dt>Seized date</dt><dd>{date(evidence.seized_date)}</dd></div>
            <div><dt>Current location</dt><dd>{value(evidence.current_location)}</dd></div>
          </dl>
        </div>
        <div className="card">
          <div className="label">Evidence file</div>
          {mediaUrl && isImage ? <img className="evidence-preview" src={mediaUrl} alt={"Evidence " + evidence.evidence_code} /> : null}
          {mediaUrl && isAudio ? <audio className="media-player" controls src={mediaUrl}>Your browser does not support audio playback.</audio> : null}
          {mediaUrl && isVideo ? <video className="media-player" controls src={mediaUrl}>Your browser does not support video playback.</video> : null}
          {mediaUrl && !isImage && !isAudio && !isVideo ? <Link className="button" href={mediaUrl} target="_blank">Open file</Link> : null}
          {!mediaUrl ? <p>No media file is attached.</p> : <p><Link className="button" href={mediaUrl} target="_blank">Open original file</Link></p>}
        </div>
      </section>

      <section className="card detail-section">
        <div className="topbar"><div><div className="label">Legal chain of custody</div><h2>Movement history</h2></div><span className="label">{logs.length} event(s)</span></div>
        {logs.length === 0 ? <p>No custody events have been recorded.</p> : <div className="stack">{logs.map((log) => <article className="list-item" key={String(log.log_id)}>
          <div><strong>{value(String(log.action ?? ""))}</strong><p>{value(String(log.from_location ?? ""))} → {value(String(log.to_location ?? ""))}</p><small>{date(log.action_date_time ? String(log.action_date_time) : null)} · Handled by {value(String(log.handled_by_name ?? ""))}</small>{log.remarks ? <p>{String(log.remarks)}</p> : null}</div>
        </article>)}</div>}
      </section>
    </>
  );
}
