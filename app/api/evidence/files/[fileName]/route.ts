import { getSession } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const mimeByExtension: Record<string,string> = { ".mp3":"audio/mpeg", ".wav":"audio/wav", ".m4a":"audio/mp4", ".mp4":"video/mp4", ".webm":"video/webm", ".mov":"video/quicktime", ".ogg":"audio/ogg" };

export async function GET(_request:Request,{params}:{params:Promise<{fileName:string}>}){
  if(!(await getSession()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {fileName}=await params;
  if(path.basename(fileName)!==fileName)return NextResponse.json({error:"Invalid file name"},{status:400});
  try{
    const data=await readFile(path.join(process.cwd(),"storage","evidence",fileName));
    const type=mimeByExtension[path.extname(fileName).toLowerCase()]??"application/octet-stream";
    return new NextResponse(data,{headers:{"Content-Type":type,"Content-Disposition":`inline; filename="${fileName}"`}});
  }catch{return NextResponse.json({error:"Media file not found"},{status:404});}
}
