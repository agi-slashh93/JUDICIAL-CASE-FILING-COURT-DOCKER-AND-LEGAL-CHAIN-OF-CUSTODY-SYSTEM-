import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return <html lang="en"><body><main className="shell"><nav className="topbar"><Link className="brand" href="/">JUDICIAL <span>CHAIN</span></Link><div>{session ? <><span style={{marginRight:12,color:"#9aacbf"}}>{session.fullName} · {session.role}</span><Link className="button" href="/api/auth/logout">Sign out</Link></> : <Link className="button" href="/login">Sign in</Link>}</div></nav>{children}</main></body></html>;
}
