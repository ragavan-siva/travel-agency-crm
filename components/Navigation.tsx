"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session));
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  async function logout() {
    closeMenu();

    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.replace("/login");
  }

  // Do not show CRM navigation on the login page.
  if (pathname === "/login" || checkingAuth || !loggedIn) {
    return null;
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* LOGO */}
        <Link
          href="/dashboard"
          className="brand"
          onClick={closeMenu}
        >
          <img
            src="/travel-logo.jpeg"
            alt="Sri Ragavendra Air Travels"
            className="brand-logo"
          />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="desktop-nav">
          <Link href="/dashboard">
            Dashboard
          </Link>

          <Link href="/bookings">
            Bookings
          </Link>

          <Link href="/services">
            Services
          </Link>

          <Link href="/customers">
            Customers
          </Link>

          <Link href="/reports">
            Reports
          </Link>

          {/* Logout looks like a normal navigation option */}
          <button
            type="button"
            onClick={logout}
            className="logout-link"
          >
            Logout
          </button>
        </nav>

        {/* MOBILE BUTTON */}
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* MOBILE NAV */}
      {menuOpen && (
        <nav className="mobile-nav">
          <Link
            href="/dashboard"
            onClick={closeMenu}
          >
            Dashboard
          </Link>

          <Link
            href="/bookings"
            onClick={closeMenu}
          >
            Bookings
          </Link>

          <Link
            href="/services"
            onClick={closeMenu}
          >
            Services
          </Link>

          <Link
            href="/customers"
            onClick={closeMenu}
          >
            Customers
          </Link>

          <Link
            href="/reports"
            onClick={closeMenu}
          >
            Reports
          </Link>

          <button
            type="button"
            onClick={logout}
            className="logout-link"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
