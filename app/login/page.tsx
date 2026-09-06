"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      window.location.replace("/dashboard");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please check your credentials."
      );
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="aif-page">
        <div className="aif-aurora" />
        <div className="aif-loading">
          <div className="aif-ring" />
          <p>Preparing your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="aif-page">

      {/* Ambient premium background */}
      <div className="aif-aurora" />
      <div className="aif-orbit one" />
      <div className="aif-orbit two" />

      {/* Floating glass panels */}
      <div className="aif-float aif-float-one">
        <div className="aif-float-icon indigo">◆</div>
        <div>
          <strong>Live sync</strong>
          <small>Itineraries updating</small>
        </div>
      </div>

      <div className="aif-float aif-float-two">
        <div className="aif-float-icon champagne">24</div>
        <div>
          <strong>Trips today</strong>
          <small>Across 6 regions</small>
        </div>
      </div>

      <div className="aif-float aif-float-three">
        <div className="aif-float-icon ink">✓</div>
        <div>
          <strong>Approvals moving</strong>
          <small>No blockers</small>
        </div>
      </div>

      {/* Main glass card */}
      <section className="aif-card">
        <div className="aif-card-inner">

          <div className="aif-brandrow">
            <div className="aif-mark">
              <span>SR</span>
            </div>
            <div className="aif-brand-text">
              <strong>SR Travels</strong>
              <span>Travel CRM</span>
            </div>
            <div className="aif-pill">
              <i />
              Live
            </div>
          </div>

          <div className="aif-heading">
            <h1>Welcome back</h1>
            <p>If you don't have account, contact ragavnsiva@gmail.com</p>
          </div>

          <form onSubmit={login} className="aif-form">

            <div className="aif-field">
              <label htmlFor="email">Email address</label>

              <div className="aif-input">
                <span className="aif-input-mark">@</span>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="aif-field">
              <label htmlFor="password">Password</label>

              <div className="aif-input">
                <span className="aif-input-mark">•</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="aif-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <div className="aif-error" role="alert">
                <i>!</i>
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              className="aif-submit"
              disabled={loading}
            >
              <span>
                {loading ? "Logging in..." : "Continue"}
              </span>

              {!loading && (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M2 12.5L21 12.5M21 12.5L14.5 6M21 12.5L14.5 19"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

          </form>

          <div className="aif-footer">
            <span>Travel company management platform</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
    </main>
  );
}