import Link from "next/link";

export function Navigation() {
  return (
    <header className="topbar">
      <div className="topbar-inner">

        <Link
          className="brand"
          href="/dashboard"
          aria-label="Sri Ragavendra Air Travels"
        >
          <img
            src="/travel-logo.jpeg"
            alt="Sri Ragavendra Air Travels"
            className="brand-logo"
          />
        </Link>

        <nav className="nav">
          <Link href="/dashboard">
            Dashboard
          </Link>

          <Link href="/bookings">
            Bookings
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

      </div>
    </header>
  );
}