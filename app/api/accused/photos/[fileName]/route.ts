import { getSession } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET(_request:Request,{params}:{params:Promise<{fileName:string}>}){
  if(!(await getSession()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {fileName}=await params;
  if(path.basename(fileName)!==fileName)return NextResponse.json({error:"Invalid file name"},{status:400});
  try{const data=await readFile(path.join(process.cwd(),"storage","accused",fileName));return new NextResponse(data,{headers:{"Content-Type":"image/*","Content-Disposition":`inline; filename="${fileName}"`}})}catch{return NextResponse.json({error:"Photo not found"},{status:404});}
}
