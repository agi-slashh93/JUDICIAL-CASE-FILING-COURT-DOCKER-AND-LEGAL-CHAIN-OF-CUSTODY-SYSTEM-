import Link from "next/link";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/mysql";
import type { CaseSummary } from "@/lib/types";

export default async function Home() {
  const session = await getSession();
  if (!session) return <section className="hero"><div><div className="label">Team 16 · Level 3 mini project</div><h1>Judicial Case Filing, Court Docket and Legal Chain of Custody</h1><p>A secure workspace for court case registration, hearings, documents, evidence, and an auditable custody trail.</p><Link className="button primary" href="/login">Open the case desk</Link></div></section>;
  const [rows] = await pool.query("SELECT * FROM v_case_dashboard ORDER BY filing_date DESC LIMIT 20");
  const cases = rows as CaseSummary[];
  const totals = { cases: cases.length, evidence: cases.reduce((n,c)=>n+Number(c.evidence_count),0), documents: cases.reduce((n,c)=>n+Number(c.document_count),0), hearings: cases.filter(c=>c.next_hearing_date).length };
  return <><section className="hero"><div><div className="label">Operations dashboard</div><h1>Case desk</h1><p>Track docket activity and preserve every evidence movement.</p></div><div><Link className="button" href="/cases/solved">Solved cases</Link> <Link className="button primary" href="/cases/new">File a case</Link> <Link className="button" href="/evidence/new">Register evidence</Link></div></section><section className="grid">{[["Active cases",totals.cases],["Evidence items",totals.evidence],["Documents",totals.documents],["Upcoming hearings",totals.hearings]].map(([label,value])=><div className="card" key={String(label)}><div className="label">{label}</div><div className="metric">{value}</div></div>)}</section><section className="card" style={{marginTop:18}}><div className="topbar"><h2>Recent cases</h2><Link className="button" href="/cases">View all</Link></div><table><thead><tr><th>Case</th><th>Title</th><th>Status</th><th>Evidence</th><th>Next hearing</th></tr></thead><tbody>{cases.map(c=><tr key={c.case_id}><td><Link href={`/cases/${c.case_id}`}>{c.case_number}</Link></td><td>{c.title}</td><td className="status">{c.status}</td><td>{c.evidence_count}</td><td>{c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString("en-IN") : "-"}</td></tr>)}</tbody></table></section></>;
}
