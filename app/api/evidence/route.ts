import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";
import { auditEvent } from "@/lib/mongo";
import { evidenceSchema } from "@/lib/validation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function GET(){if(!(await getSession()))return NextResponse.json({error:"Unauthorized"},{status:401}); const [rows]=await pool.query("SELECT * FROM evidence ORDER BY evidence_id DESC"); return NextResponse.json(rows);}
export async function POST(req:Request){
  const s=await getSession();
  if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const form=await req.formData();
  const file=form.get("file");
  if(!(file instanceof File) || file.size===0)return NextResponse.json({error:"An audio or video file is required"},{status:400});
  if(!file.type.startsWith("audio/") && !file.type.startsWith("video/"))return NextResponse.json({error:"Only audio and video files are allowed"},{status:400});
  if(file.size>100*1024*1024)return NextResponse.json({error:"Media file must be 100 MB or smaller"},{status:400});
  const fields=Object.fromEntries([...form.entries()].filter(([key])=>key!=="file").map(([key,value])=>[key,String(value)]));
  const parsed=evidenceSchema.safeParse(fields);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues},{status:400});
  const v=parsed.data;
  const ext=path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g,"")||".media";
  const storedName=`${randomUUID()}${ext}`;
  const storageDir=path.join(process.cwd(),"storage","evidence");
  await mkdir(storageDir,{recursive:true});
  await writeFile(path.join(storageDir,storedName),Buffer.from(await file.arrayBuffer()));
  const [r]=await pool.execute("INSERT INTO evidence(case_id,evidence_code,description,type,seized_from,seized_date,current_location,file_path_url) VALUES(?,?,?,?,?,?,?,?)",[v.case_id,v.evidence_code,v.description,v.type,v.seized_from??null,v.seized_date??null,v.current_location??null,storedName]);
  const id=(r as {insertId:number}).insertId;
  await auditEvent({eventType:"EVIDENCE_REGISTERED",caseId:v.case_id,actorId:s.userId,payload:{evidenceId:id,fileName:file.name,mimeType:file.type,fileSize:file.size,...v}});
  return NextResponse.json({ok:true,evidenceId:id,fileUrl:`/api/evidence/files/${storedName}`},{status:201});
}
