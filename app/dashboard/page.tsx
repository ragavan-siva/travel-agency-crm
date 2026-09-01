"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Customer = {
  id?: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Booking = {
  id: string;
  booking_reference: string | null;
  booking_type: string | null;
  origin: string | null;
  destination: string | null;
  departure_at: string | null;
  passenger_count: number | null;
  ticket_amount: number | null;
  paid_amount: number | null;
  payment_status: string | null;
  booking_status: string | null;
  customers: Customer | Customer[] | null;
};

type BookingRow = Omit<Booking, "customers"> & {
  customers: Customer | Customer[] | null;
};

function getCustomer(
  customers: Customer | Customer[] | null
): Customer | null {
  if (Array.isArray(customers)) {
    return customers[0] || null;
  }

  return customers;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function todayOnly() {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_reference,
          booking_type,
          origin,
          destination,
          departure_at,
          passenger_count,
          ticket_amount,
          paid_amount,
          payment_status,
          booking_status,
          customers (
            id,
            full_name,
            phone,
            email
          )
        `)
        .order("departure_at", {
          ascending: true,
          nullsFirst: false,
        });

      if (error) {
        throw error;
      }

      const rows = (data as BookingRow[]) || [];

      const normalizedBookings: Booking[] = rows.map(
        (booking) => ({
          ...booking,
          customers: getCustomer(
            booking.customers
          ),
        })
      );

      setBookings(normalizedBookings);
    } catch (error) {
      console.error("Dashboard error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  /*
   * =========================================
   * UPCOMING TRAVEL
   * =========================================
   */

  const today = todayOnly();

  const upcomingTravels = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (!booking.departure_at) {
          return false;
        }

        return dateOnly(
          booking.departure_at
        ) >= today;
      })
      .sort((a, b) => {
        return (
          new Date(
            a.departure_at || ""
          ).getTime() -
          new Date(
            b.departure_at || ""
          ).getTime()
        );
      })
      .slice(0, 5);
  }, [bookings, today]);

  return (
    <main className="container dashboard-container">

      {/* =====================================
          HEADER
          ===================================== */}

      <div className="dashboard-header">

        <div>
          <h1 className="page-title">
            Dashboard
          </h1>

          <p className="muted">
            Upcoming customer travel and daily operations.
          </p>
        </div>

        <div className="dashboard-header-actions">

          <button
            type="button"
            className="btn secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

          <Link
            href="/bookings"
            className="btn"
          >
            + New Booking
          </Link>

        </div>

      </div>


      {/* =====================================
          ERROR
          ===================================== */}

      {errorMessage && (
        <div className="dashboard-error">
          {errorMessage}
        </div>
      )}


      {/* =====================================
          UPCOMING TRAVEL
          ===================================== */}

      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <h2>
              Upcoming Travel
            </h2>

            <p className="muted">
              Your next customer travels.
            </p>
          </div>

          <Link
            href="/bookings"
            className="dashboard-view-link"
          >
            View All →
          </Link>

        </div>


        {loading && (
          <div className="dashboard-empty">
            Loading upcoming travel...
          </div>
        )}


        {!loading &&
          upcomingTravels.length === 0 && (
            <div className="dashboard-empty">

              <div className="dashboard-empty-icon">
                ✈
              </div>

              <strong>
                No upcoming travel
              </strong>

              <p>
                Bookings with today's or a future
                travel date will appear here.
              </p>

              <Link
                href="/bookings"
                className="btn"
              >
                + Add Booking
              </Link>

            </div>
          )}


        {!loading &&
          upcomingTravels.length > 0 && (
            <div className="upcoming-travel-list">

              {upcomingTravels.map(
                (booking) => {
                  const customer =
                    getCustomer(
                      booking.customers
                    );

                  const isToday =
                    dateOnly(
                      booking.departure_at
                    ) === today;

                  return (
                    <div
                      key={booking.id}
                      className="upcoming-travel-card"
                    >

                      {/* DATE */}

                      <div className="upcoming-date-box">

                        <strong>
                          {booking.departure_at
                            ? new Date(
                                booking.departure_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                }
                              )
                            : "--"}
                        </strong>

                        <span>
                          {booking.departure_at
                            ? new Date(
                                booking.departure_at
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  month: "short",
                                }
                              )
                            : ""}
                        </span>

                        {isToday && (
                          <small>
                            Today
                          </small>
                        )}

                      </div>


                      {/* CUSTOMER */}

                      <div className="upcoming-travel-details">

                        <div className="upcoming-customer">

                          <strong>
                            {customer?.full_name ||
                              "Unknown Customer"}
                          </strong>

                          {customer?.phone && (
                            <span>
                              {customer.phone}
                            </span>
                          )}

                        </div>


                        {/* ROUTE */}

                        <div className="upcoming-route">

                          <strong>
                            {booking.origin ||
                              "-"}
                          </strong>

                          <span>
                            →
                          </span>

                          <strong>
                            {booking.destination ||
                              "-"}
                          </strong>

                        </div>


                        {/* DETAILS */}

                        <div className="upcoming-meta">

                          <span>
                            Type:{" "}
                            {booking.booking_type ||
                              "Single"}
                          </span>

                          <span>
                            Passengers:{" "}
                            {booking.passenger_count ||
                              1}
                          </span>

                          {booking.departure_at &&
                            formatTime(
                              booking.departure_at
                            ) && (
                              <span>
                                Time:{" "}
                                {formatTime(
                                  booking.departure_at
                                )}
                              </span>
                            )}

                        </div>

                      </div>


                      {/* AMOUNT */}

                      <div className="upcoming-travel-right">

                        <span>
                          Ticket Amount
                        </span>

                        <strong>
                          {money(
                            Number(
                              booking.ticket_amount ||
                                0
                            )
                          )}
                        </strong>

                        <Link
                          href="/bookings"
                          className="small-view-link"
                        >
                          View
                        </Link>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

      </section>


      {/* =====================================
          QUICK LINKS
          ===================================== */}

      <section className="dashboard-quick-links">

        <Link
          href="/bookings"
          className="dashboard-quick-card"
        >
          <strong>
            + New Booking
          </strong>

          <span>
            Add a customer travel booking
          </span>
        </Link>


        <Link
          href="/customers"
          className="dashboard-quick-card"
        >
          <strong>
            Customers
          </strong>

          <span>
            Manage your customers
          </span>
        </Link>


        <Link
          href="/reports"
          className="dashboard-quick-card"
        >
          <strong>
            Reports
          </strong>

          <span>
            View monthly and quarterly profit
          </span>
        </Link>

      </section>

    </main>
  );
}