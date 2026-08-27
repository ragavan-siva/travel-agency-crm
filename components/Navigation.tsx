"use client";

import Link from "next/link";
import { useState } from "react";

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* Logo */}
        <Link
          className="brand"
          href="/dashboard"
          aria-label="Sri Ragavendra Air Travels"
          onClick={closeMenu}
        >
          <img
            src="/travel-logo.jpeg"
            alt="Sri Ragavendra Air Travels"
            className="brand-logo"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav desktop-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/bookings">Bookings</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/login">Login</Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
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

          <Link
            href="/login"
            onClick={closeMenu}
          >
            Login
          </Link>

        </nav>
      )}
    </header>
  );
}