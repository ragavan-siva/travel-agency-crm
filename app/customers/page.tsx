"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase";

type C={id:string;full_name:string;phone:string|null;email:string|null;notes:string|null};
type B={id:string;booking_reference:string|null;pnr:string|null;origin:string|null;destination:string|null;departure_at:string|null;ticket_amount:number|null;booking_status:string};

export default function Customers(){
 const [cs,setCs]=useState<C[]>([]),[q,setQ]=useState(""),[selected,setSelected]=useState<C|null>(null),[history,setHistory]=useState<B[]>([]);
 const [form,setForm]=useState({full_name:"",phone:"",email:"",notes:""}),[editing,setEditing]=useState(false),[msg,setMsg]=useState("");
 async function load(){const {data,error}=await createClient().from("customers").select("*").order("full_name");if(error)setMsg(error.message);else setCs(data||[])}
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>{let x=q.toLowerCase();return cs.filter(c=>[c.full_name,c.phone,c.email].filter(Boolean).join(" ").toLowerCase().includes(x))},[cs,q]);
 function newC(){setSelected(null);setForm({full_name:"",phone:"",email:"",notes:""});setEditing(true)}
 function editC(c:C){setSelected(c);setForm({full_name:c.full_name,phone:c.phone||"",email:c.email||"",notes:c.notes||""});setEditing(true)}
 async function save(){const s=createClient(),p={full_name:form.full_name.trim(),phone:form.phone.trim()||null,email:form.email.trim()||null,notes:form.notes.trim()||null};if(!p.full_name){setMsg("Name is required.");return}const r=selected?await s.from("customers").update(p).eq("id",selected.id):await s.from("customers").insert(p);if(r.error)setMsg(r.error.message);else{setEditing(false);setMsg("Customer saved.");load()}}
 async function remove(c:C){if(!confirm(`Delete ${c.full_name}?`))return;const {error}=await createClient().from("customers").delete().eq("id",c.id);if(error)setMsg(error.message);else load()}
 async function showHistory(c:C){setSelected(c);const {data,error}=await createClient().from("bookings").select("id,booking_reference,pnr,origin,destination,departure_at,ticket_amount,booking_status").eq("customer_id",c.id).order("departure_at",{ascending:false});if(error)setMsg(error.message);else setHistory(data||[])}
 return <main className="container"><div className="row"><div><h1 className="page-title">Customers</h1><p className="muted">Customer profiles and booking history.</p></div><button className="btn" onClick={newC}>+ Customer</button></div>
 {msg&&<div className="card" style={{marginTop:16}}>{msg}</div>}
 {editing&&<div className="card" style={{marginTop:16}}><div className="row"><h2 style={{margin:0}}>{selected?"Edit Customer":"New Customer"}</h2><button className="btn secondary" onClick={()=>setEditing(false)}>Cancel</button></div><div className="grid grid-2" style={{marginTop:16}}>{(["full_name","phone","email","notes"] as const).map(k=><div className="field" key={k}><label className="label">{k==="full_name"?"Name":k[0].toUpperCase()+k.slice(1)}</label><input className="input" type={k==="email"?"email":"text"} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}</div><button className="btn" onClick={save}>Save Customer</button></div>}
 <div className="card" style={{marginTop:16}}><input className="input" placeholder="Search name, phone or email..." value={q} onChange={e=>setQ(e.target.value)}/><div className="table-wrap" style={{marginTop:16}}><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
 {filtered.length===0?<tr><td colSpan={4} className="muted">No customers.</td></tr>:filtered.map(c=><tr key={c.id}><td>{c.full_name}</td><td>{c.phone||"-"}</td><td>{c.email||"-"}</td><td><button className="btn secondary" onClick={()=>showHistory(c)}>History</button>{" "}<button className="btn secondary" onClick={()=>editC(c)}>Edit</button>{" "}<button className="btn danger" onClick={()=>remove(c)}>Delete</button></td></tr>)}
 </tbody></table></div></div>
 {selected&&!editing&&<div className="card" style={{marginTop:16}}><div className="row"><h2 style={{margin:0}}>{selected.full_name} — Booking History</h2><button className="btn secondary" onClick={()=>setSelected(null)}>Close</button></div><div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>Reference</th><th>PNR</th><th>Route</th><th>Departure</th><th>Amount</th><th>Status</th></tr></thead><tbody>{history.length===0?<tr><td colSpan={6} className="muted">No bookings.</td></tr>:history.map(b=><tr key={b.id}><td>{b.booking_reference||"-"}</td><td>{b.pnr||"-"}</td><td>{b.origin||"-"} → {b.destination||"-"}</td><td>{b.departure_at?new Date(b.departure_at).toLocaleString("en-IN"):"-"}</td><td>₹{Number(b.ticket_amount||0).toLocaleString("en-IN")}</td><td><span className="badge">{b.booking_status}</span></td></tr>)}</tbody></table></div></div>}
 </main>
}
