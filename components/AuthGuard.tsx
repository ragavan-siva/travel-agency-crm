"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [ready, setReady] = useState(
    pathname === "/login"
  );

  useEffect(() => {
    // Login page does not need protection
    if (pathname === "/login") {
      setReady(true);
      return;
    }

    const supabase = createClient();

    let active = true;

    // Check whether the user is logged in
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (!data.session) {
        window.location.replace("/login");
        return;
      }

      setReady(true);
    });

    // Watch for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  // Show nothing while checking authentication
  if (!ready) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ marginTop: 60 }}
        >
          <p className="muted">
            Checking login...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}