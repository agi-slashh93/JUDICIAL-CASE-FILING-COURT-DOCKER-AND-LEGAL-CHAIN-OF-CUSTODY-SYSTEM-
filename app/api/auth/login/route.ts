import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, findUser } from "@/lib/auth";
import { auditEvent } from "@/lib/mongo";

export async function POST(request: Request) { const {email,password}=await request.json(); const user=await findUser(String(email).toLowerCase()); if(!user || !(await bcrypt.compare(String(password),user.password_hash))) return NextResponse.json({error:"Invalid credentials"},{status:401}); await createSession({userId:user.user_id,fullName:user.full_name,role:user.role_name}); await auditEvent({eventType:"LOGIN",actorId:user.user_id,payload:{email:user.email}}); return NextResponse.json({ok:true}); }
