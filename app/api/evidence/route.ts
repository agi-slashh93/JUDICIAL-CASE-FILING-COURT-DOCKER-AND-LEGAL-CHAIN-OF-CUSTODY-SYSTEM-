import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";
import { auditEvent } from "@/lib/mongo";
import { evidenceSchema } from "@/lib/validation";
export async function GET(){if(!(await getSession()))return NextResponse.json({error:"Unauthorized"},{status:401}); const [rows]=await pool.query("SELECT * FROM evidence ORDER BY evidence_id DESC"); return NextResponse.json(rows);}
export async function POST(req:Request){const s=await getSession();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=evidenceSchema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues},{status:400});const v=parsed.data;const [r]=await pool.execute("INSERT INTO evidence(case_id,evidence_code,description,type,seized_from,seized_date,current_location) VALUES(?,?,?,?,?,?,?)",[v.case_id,v.evidence_code,v.description,v.type,v.seized_from??null,v.seized_date??null,v.current_location??null]);const id=(r as {insertId:number}).insertId;await auditEvent({eventType:"EVIDENCE_REGISTERED",caseId:v.case_id,actorId:s.userId,payload:{evidenceId:id,...v}});return NextResponse.json({ok:true,evidenceId:id},{status:201});}
