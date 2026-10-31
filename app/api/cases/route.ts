import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";
import { auditEvent } from "@/lib/mongo";
import { accusedSchema, caseSchema } from "@/lib/validation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function GET(){if(!(await getSession())) return NextResponse.json({error:"Unauthorized"},{status:401}); const [rows]=await pool.query("SELECT * FROM v_case_dashboard ORDER BY filing_date DESC"); return NextResponse.json(rows);}

export async function POST(req:Request){
  const s=await getSession();
  if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const form=await req.formData();
  const fields=Object.fromEntries([...form.entries()].filter(([key])=>key!=="accused_photo").map(([key,value])=>[key,String(value)]));
  const parsed=caseSchema.safeParse(fields);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues},{status:400});
  const v=parsed.data;
  const accused=accusedSchema.safeParse(fields);
  if(!accused.success)return NextResponse.json({error:accused.error.issues},{status:400});
  const photo=form.get("accused_photo");
  if(!(photo instanceof File) || photo.size===0)return NextResponse.json({error:"An accused photo is required"},{status:400});
  if(!photo.type.startsWith("image/"))return NextResponse.json({error:"Accused photo must be an image"},{status:400});
  if(photo.size>5*1024*1024)return NextResponse.json({error:"Accused photo must be 5 MB or smaller"},{status:400});
  const connection=await pool.getConnection();
  let photoName:string|null=null;
  try{
    await connection.beginTransaction();
    const [r]=await connection.execute("INSERT INTO `case` (case_number,title,case_type,filing_date,status,court_id,filed_by) VALUES (?,?,?,?,?,?,?)",[v.case_number,v.title,v.case_type,v.filing_date,v.status,v.court_id,s.userId]);
    const caseId=(r as {insertId:number}).insertId;
    const ext=path.extname(photo.name).toLowerCase().replace(/[^a-z0-9.]/g,"")||".img";
    photoName=`${randomUUID()}${ext}`;
    const dir=path.join(process.cwd(),"storage","accused");
    await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,photoName),Buffer.from(await photo.arrayBuffer()));
    const a=accused.data;
    await connection.execute("INSERT INTO accused_person (case_id,full_name,identity_number,nationality,address,age,gender,phone,photo_path_url) VALUES (?,?,?,?,?,?,?,?,?)",[caseId,a.accused_full_name,a.accused_identity_number??null,a.accused_nationality??null,a.accused_address??null,a.accused_age??null,a.accused_gender??null,a.accused_phone??null,photoName]);
    await connection.commit();
    await auditEvent({eventType:"CASE_CREATED",caseId,actorId:s.userId,payload:{...v,accused:a}});
    return NextResponse.json({ok:true,caseId},{status:201});
  }catch(error){await connection.rollback();return NextResponse.json({error:error instanceof Error?error.message:"Could not create case"},{status:400});}
  finally{connection.release();}
}
