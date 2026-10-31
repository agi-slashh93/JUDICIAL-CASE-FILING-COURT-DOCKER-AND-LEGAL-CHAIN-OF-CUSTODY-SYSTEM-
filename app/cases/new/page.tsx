"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function NewCase(){
  const [message,setMessage]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const body=new FormData(e.currentTarget);
    const r=await fetch("/api/cases",{method:"POST",body});
    const data=await r.json().catch(()=>({}));
    setMessage(r.ok?"Case and accused details saved successfully":(data.error??"Please check the form and try again"));
    if(r.ok)setTimeout(()=>router.push("/cases"),700);
  }
  return <section className="two"><div><div className="label">Case intake</div><h1>File a new case</h1><p>Case and accused identity data are validated by the API and database. The accused photo is stored privately and linked to the case.</p></div><form className="card" onSubmit={submit} encType="multipart/form-data"><h2>Case details</h2><label>Case number<input name="case_number" required placeholder="JC-2026-0002"/></label><label>Title<input name="title" required/></label><label>Case type<input name="case_type" required placeholder="Criminal"/></label><label>Filing date<input name="filing_date" type="date" required/></label><label>Court ID<input name="court_id" type="number" min="1" defaultValue="1" required/></label><label>Status<select name="status" defaultValue="OPEN"><option>OPEN</option><option>IN_PROGRESS</option><option>CLOSED</option><option>ARCHIVED</option></select></label><h2 style={{marginTop:18}}>Accused identity details</h2><label>Full name<input name="accused_full_name" required/></label><label>Identity number<input name="accused_identity_number" placeholder="Passport, national ID, etc."/></label><label>Nationality<input name="accused_nationality" placeholder="Indian"/></label><label>Address<textarea name="accused_address" rows={3}/></label><label>Age<input name="accused_age" type="number" min="0" max="130"/></label><label>Gender<input name="accused_gender"/></label><label>Phone<input name="accused_phone" type="tel"/></label><label>Accused photo<input name="accused_photo" type="file" accept="image/*" required/></label>{message&&<p className={message.startsWith("Case")?"status":"error"}>{message}</p>}<button className="button primary">Save case and accused</button></form></section>
}
