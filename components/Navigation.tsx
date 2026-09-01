"use client";

import Link from "next/link";
import { useState } from "react";

export function Navigation() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  function closeMenu() {
    setMenuOpen(false);
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

          <Link href="/login">
            Login
          </Link>

        </nav>

        {/* MOBILE BUTTON */}

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
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