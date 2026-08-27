"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDateOnly(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Please login to view your dashboard.");
        setBookings([]);
        return;
      }

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
          customers: getCustomer(booking.customers),
        })
      );

      setBookings(normalizedBookings);
    } catch (error) {
      console.error(error);

      setMessage(
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
   * ================================
   * DASHBOARD TOTALS
   * ================================
   */

  const totalBookings = bookings.length;

  const totalTicketValue = bookings.reduce(
    (total, booking) =>
      total + Number(booking.ticket_amount || 0),
    0
  );

  const totalCollected = bookings.reduce(
    (total, booking) =>
      total + Number(booking.paid_amount || 0),
    0
  );

  const totalProfit =
    totalCollected - totalTicketValue;

  const outstandingAmount = bookings.reduce(
    (total, booking) => {
      const ticket =
        Number(booking.ticket_amount || 0);

      const paid =
        Number(booking.paid_amount || 0);

      return total + Math.max(ticket - paid, 0);
    },
    0
  );

  /*
   * ================================
   * UPCOMING TRAVEL
   * ================================
   *
   * Shows today's and future travels.
   */

  const today = getTodayDate();

  const upcomingTravel = bookings
    .filter((booking) => {
      if (!booking.departure_at) {
        return false;
      }

      const travelDate =
        getDateOnly(booking.departure_at);

      return travelDate >= today;
    })
    .sort((a, b) => {
      const dateA = new Date(
        a.departure_at || ""
      ).getTime();

      const dateB = new Date(
        b.departure_at || ""
      ).getTime();

      return dateA - dateB;
    })
    .slice(0, 5);

  return (
    <main className="container">

      {/* ================================
          HEADER
          ================================ */}

      <div className="row">

        <div>
          <h1 className="page-title">
            Dashboard
          </h1>

          <p className="muted">
            Travel agency business overview.
          </p>
        </div>

        <Link
          href="/bookings"
          className="btn"
        >
          + New Booking
        </Link>

      </div>

      {/* ================================
          MESSAGE
          ================================ */}

      {message && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >
          {message}
        </div>
      )}

      {/* ================================
          SUMMARY CARDS
          ================================ */}

      <div
        className="grid grid-4"
        style={{
          marginTop: 24,
        }}
      >

        {/* Total Bookings */}

        <div className="card">

          <div className="stat-label">
            Total Bookings
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {loading ? "..." : totalBookings}
          </div>

        </div>


        {/* Ticket Value */}

        <div className="card">

          <div className="stat-label">
            Ticket Value
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {loading
              ? "..."
              : money(totalTicketValue)}
          </div>

        </div>


        {/* Collected */}

        <div className="card">

          <div className="stat-label">
            Collected
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {loading
              ? "..."
              : money(totalCollected)}
          </div>

        </div>


        {/* Profit */}

        <div
          className="card"
          style={{
            background:
              totalProfit >= 0
                ? "#ecfdf5"
                : "#fef2f2",
          }}
        >

          <div className="stat-label">
            Total Profit
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              marginTop: 6,
              color:
                totalProfit >= 0
                  ? "#008000"
                  : "#dc2626",
            }}
          >
            {loading
              ? "..."
              : money(totalProfit)}
          </div>

        </div>

      </div>


      {/* ================================
          OUTSTANDING
          ================================ */}

      <div
        className="card"
        style={{
          marginTop: 18,
        }}
      >

        <div className="stat-label">
          Outstanding Customer Amount
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginTop: 5,
          }}
        >
          {loading
            ? "..."
            : money(outstandingAmount)}
        </div>

      </div>


      {/* ================================
          UPCOMING TRAVEL
          ================================ */}

      <div
        className="card"
        style={{
          marginTop: 24,
          padding: 24,
        }}
      >

        <div
          className="row"
          style={{
            marginBottom: 18,
          }}
        >

          <div>

            <h2
              style={{
                margin: 0,
                fontSize: 24,
              }}
            >
              Upcoming Travel
            </h2>

            <p
              className="muted"
              style={{
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Your next customer travels.
            </p>

          </div>

          <Link
            href="/bookings"
            className="btn secondary"
          >
            View All
          </Link>

        </div>


        {/* Loading */}

        {loading && (
          <div
            style={{
              padding: "30px 10px",
              textAlign: "center",
            }}
            className="muted"
          >
            Loading upcoming travel...
          </div>
        )}


        {/* No Upcoming Travel */}

        {!loading &&
          upcomingTravel.length === 0 && (
            <div
              style={{
                padding: "35px 10px",
                textAlign: "center",
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
              }}
            >

              <div
                style={{
                  fontSize: 40,
                  marginBottom: 10,
                }}
              >
                ✈️
              </div>

              <strong>
                No upcoming travel
              </strong>

              <p
                className="muted"
                style={{
                  marginBottom: 16,
                }}
              >
                New upcoming bookings will
                appear here automatically.
              </p>

              <Link
                href="/bookings"
                className="btn"
              >
                + Add Booking
              </Link>

            </div>
          )}


        {/* Upcoming Travel Cards */}

        {!loading &&
          upcomingTravel.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >

              {upcomingTravel.map(
                (booking) => {

                  const customer =
                    booking.customers;

                  const travelDate =
                    booking.departure_at
                      ? new Date(
                          booking.departure_at
                        )
                      : null;

                  const isToday =
                    getDateOnly(
                      booking.departure_at
                    ) === today;

                  return (
                    <div
                      key={booking.id}
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 16,
                        background: "#ffffff",
                      }}
                    >

                      {/* Top Row */}

                      <div
                        className="row"
                        style={{
                          gap: 12,
                        }}
                      >

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >

                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                            }}
                          >
                            {customer?.full_name ||
                              "Unknown Customer"}
                          </div>

                          {customer?.phone && (
                            <div
                              className="muted"
                              style={{
                                marginTop: 3,
                                fontSize: 13,
                              }}
                            >
                              {customer.phone}
                            </div>
                          )}

                        </div>


                        {/* Date */}

                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >

                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {travelDate
                              ? formatDate(
                                  booking.departure_at
                                )
                              : "-"}
                          </div>

                          {isToday && (
                            <span
                              className="badge"
                              style={{
                                marginTop: 5,
                                background:
                                  "#dcfce7",
                                color:
                                  "#166534",
                              }}
                            >
                              Today
                            </span>
                          )}

                        </div>

                      </div>


                      {/* Route */}

                      <div
                        style={{
                          marginTop: 14,
                          padding: 12,
                          borderRadius: 10,
                          background: "#f8fafc",
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >

                          <strong>
                            {booking.origin ||
                              "-"}
                          </strong>

                          <span
                            style={{
                              fontSize: 20,
                            }}
                          >
                            →
                          </span>

                          <strong>
                            {booking.destination ||
                              "-"}
                          </strong>

                        </div>

                      </div>


                      {/* Details */}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 18,
                          marginTop: 14,
                          fontSize: 14,
                        }}
                      >

                        <div>
                          <span className="muted">
                            Type
                          </span>

                          <br />

                          <strong>
                            {booking.booking_type ||
                              "Single"}
                          </strong>
                        </div>


                        <div>
                          <span className="muted">
                            Passengers
                          </span>

                          <br />

                          <strong>
                            {booking.passenger_count ||
                              1}
                          </strong>
                        </div>


                        <div>
                          <span className="muted">
                            Booking Status
                          </span>

                          <br />

                          <strong>
                            {booking.booking_status ||
                              "Confirmed"}
                          </strong>
                        </div>


                        {booking.booking_reference && (
                          <div>
                            <span className="muted">
                              Reference
                            </span>

                            <br />

                            <strong>
                              {
                                booking.booking_reference
                              }
                            </strong>
                          </div>
                        )}

                      </div>


                      {/* Action */}

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent:
                            "flex-end",
                        }}
                      >

                        <Link
                          href="/bookings"
                          className="btn secondary"
                        >
                          View Booking
                        </Link>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

      </div>

    </main>
  );
}