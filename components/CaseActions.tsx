"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const statuses=["OPEN","IN_PROGRESS","CLOSED","ARCHIVED"];
export default function CaseActions({caseId,status}:{caseId:number;status:string}){
  const [selected,setSelected]=useState(status); const [message,setMessage]=useState(""); const router=useRouter();
  async function changeStatus(){const r=await fetch(`/api/cases/${caseId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:selected})}); setMessage(r.ok?"Saved":"Failed"); if(r.ok)router.refresh();}
  async function removeCase(){if(!window.confirm("Delete this case and all linked records and media?"))return; const r=await fetch(`/api/cases/${caseId}`,{method:"DELETE"}); setMessage(r.ok?"Deleted":(await r.text())); if(r.ok)router.refresh();}
  return <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><select value={selected} onChange={e=>setSelected(e.target.value)} aria-label="Case status">{statuses.map(s=><option key={s}>{s}</option>)}</select><button className="button" onClick={changeStatus}>Save</button><button className="button danger" onClick={removeCase}>Delete</button>{message&&<small>{message}</small>}</div>;
}
