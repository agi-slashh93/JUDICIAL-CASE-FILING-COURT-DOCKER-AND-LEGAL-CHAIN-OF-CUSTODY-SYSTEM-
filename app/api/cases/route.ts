import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";
import { auditEvent } from "@/lib/mongo";
import { caseSchema } from "@/lib/validation";
export async function GET(){if(!(await getSession())) return NextResponse.json({error:"Unauthorized"},{status:401}); const [rows]=await pool.query("SELECT * FROM v_case_dashboard ORDER BY filing_date DESC"); return NextResponse.json(rows);}
export async function POST(req:Request){const s=await getSession(); if(!s)return NextResponse.json({error:"Unauthorized"},{status:401}); const parsed=caseSchema.safeParse(await req.json()); if(!parsed.success)return NextResponse.json({error:parsed.error.issues},{status:400}); const v=parsed.data; const [r]=await pool.execute("INSERT INTO `case` (case_number,title,case_type,filing_date,status,court_id,filed_by) VALUES (?,?,?,?,?,?,?)",[v.case_number,v.title,v.case_type,v.filing_date,v.status,v.court_id,s.userId]); await auditEvent({eventType:"CASE_CREATED",caseId:(r as {insertId:number}).insertId,actorId:s.userId,payload:v}); return NextResponse.json({ok:true},{status:201});}
