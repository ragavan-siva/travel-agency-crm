 "use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login(e: FormEvent) {
    e.preventDefault();
    setMessage("Connecting...");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="container" style={{maxWidth: 460}}>
      <div className="card" style={{marginTop: 60}}>
        <h1 className="page-title">Travel Agency CRM</h1>
        <p className="muted">Sign in to manage your bookings.</p>
        <form onSubmit={login}>
          <div className="field">
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" style={{width:"100%"}}>Login</button>
        </form>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
