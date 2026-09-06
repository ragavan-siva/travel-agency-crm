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
      <main className="ai-login-page">
        <div className="ai-login-loader">
          <div className="ai-loader-ring" />
          <p>Preparing your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ai-login-page">

      {/* Ambient background */}
      <div className="ai-grid" />
      <div className="ai-glow ai-glow-one" />
      <div className="ai-glow ai-glow-two" />
      <div className="ai-glow ai-glow-three" />

      {/* Floating AI-style elements */}
      <div className="ai-float ai-float-one">
        <span className="float-dot" />
        <div>
          <strong>Travel Operations</strong>
          <small>Connected</small>
        </div>
      </div>

      <div className="ai-float ai-float-two">
        <span className="float-icon">✦</span>
        <div>
          <strong>Smart Workspace</strong>
          <small>Ready to work</small>
        </div>
      </div>

      <div className="ai-float ai-float-three">
        <span className="float-icon">↗</span>
        <div>
          <strong>Business Insights</strong>
          <small>Always organized</small>
        </div>
      </div>

      <div className="ai-orbit orbit-one" />
      <div className="ai-orbit orbit-two" />

      {/* Center login */}
      <section className="ai-login-card">

        <div className="ai-card-glow" />

        <div className="ai-card-content">


          <div className="ai-heading">


            <h1>
              Welcome
              <br />
              <span>back.</span>
            </h1>

            <p>
              Sign in to continue to your travel
              operations workspace.
            </p>
          </div>

          <form onSubmit={login} className="ai-login-form">

            <div className="ai-field">
              <label htmlFor="email">Email address</label>

              <div className="ai-input">
                <span className="ai-input-symbol">@</span>

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

            <div className="ai-field">
              <label htmlFor="password">Password</label>

              <div className="ai-input">
                <span className="ai-input-symbol">•</span>

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
                  className="ai-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {message && (
              <div className="ai-error" role="alert">
                <span>!</span>
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              className="ai-signin"
              disabled={loading}
            >
              <span>
                {loading ? "Signing in..." : "Continue to workspace"}
              </span>

              {!loading && <span className="ai-signin-arrow">→</span>}
            </button>

          </form>

          <div className="ai-footer">
            <span>TRAVEL MANAGEMENT PLATFORM</span>
            <span>© {new Date().getFullYear()}</span>
          </div>

        </div>
      </section>
    </main>
  );
}
