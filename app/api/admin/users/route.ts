import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/mysql";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [rows] = await pool.query("SELECT user_id, full_name, email, role_name, status, created_at FROM v_user_roles ORDER BY created_at DESC");
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "FORBIDDEN" ? "Forbidden" : "Unauthorized" }, { status: 403 });
  }
}
