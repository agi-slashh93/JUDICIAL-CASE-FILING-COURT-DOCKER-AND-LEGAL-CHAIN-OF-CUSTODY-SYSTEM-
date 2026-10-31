import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/mysql";
import { auditEvent } from "@/lib/mongo";
import { unlink } from "node:fs/promises";
import path from "node:path";

const validStatuses=["OPEN","IN_PROGRESS","CLOSED","ARCHIVED"] as const;
type Params={params:Promise<{caseId:string}>};

export async function PATCH(request:Request,{params}:Params){
  const session=await getSession(); if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  const id=Number((await params).caseId); const {status}=await request.json();
  if(!Number.isInteger(id)||!validStatuses.includes(status))return NextResponse.json({error:"Invalid case or status"},{status:400});
  const [result]=await pool.execute("UPDATE `case` SET status=? WHERE case_id=?",[status,id]);
  if((result as {affectedRows:number}).affectedRows===0)return NextResponse.json({error:"Case not found"},{status:404});
  await auditEvent({eventType:"CASE_STATUS_CHANGED",caseId:id,actorId:session.userId,payload:{status}});
  return NextResponse.json({ok:true});
}

export async function DELETE(_request:Request,{params}:Params){
  const session=await getSession(); if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(session.role!=="ADMIN")return NextResponse.json({error:"Only administrators can delete cases"},{status:403});
  const id=Number((await params).caseId); if(!Number.isInteger(id))return NextResponse.json({error:"Invalid case"},{status:400});
  const [media]=await pool.query("SELECT file_path_url FROM evidence WHERE case_id=? AND file_path_url IS NOT NULL",[id]);
  const [photos]=await pool.query("SELECT photo_path_url FROM accused_person WHERE case_id=? AND photo_path_url IS NOT NULL",[id]);
  const [result]=await pool.execute("DELETE FROM `case` WHERE case_id=?",[id]);
  if((result as {affectedRows:number}).affectedRows===0)return NextResponse.json({error:"Case not found"},{status:404});
  for(const row of media as Array<{file_path_url:string}>){await unlink(path.join(process.cwd(),"storage","evidence",row.file_path_url)).catch(()=>{});}
  for(const row of photos as Array<{photo_path_url:string}>){await unlink(path.join(process.cwd(),"storage","accused",row.photo_path_url)).catch(()=>{});}
  await auditEvent({eventType:"CASE_DELETED",caseId:id,actorId:session.userId,payload:{}});
  return NextResponse.json({ok:true});
}
