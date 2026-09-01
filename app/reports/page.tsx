"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Booking = {
  id: string;
  departure_at: string | null;
  booking_date: string | null;
  ticket_amount: number | null;
  paid_amount: number | null;
  booking_status: string | null;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [error, setError] = useState("");

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please login to view reports.");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          departure_at,
          ticket_amount,
          paid_amount,
          booking_status
        `)
        .order("booking_date", {
          ascending: true,
          nullsFirst: false,
        });

      if (error) {
        throw error;
      }

      setBookings((data as Booking[]) || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();

    const interval = setInterval(
      loadBookings,
      30000
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * AVAILABLE YEARS
   */

  const availableYears = useMemo(() => {
    const years = bookings
      .filter((booking) => booking.booking_date)
      .map((booking) =>
        new Date(
          booking.booking_date as string
        ).getFullYear()
      );

    years.push(new Date().getFullYear());

    return Array.from(new Set(years)).sort(
      (a, b) => b - a
    );
  }, [bookings]);

  /*
   * BOOKINGS FOR SELECTED YEAR
   */

  const yearBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (!booking.booking_date) {
        return false;
      }

      const date = new Date(
        booking.booking_date
      );

      return date.getFullYear() === selectedYear;
    });
  }, [bookings, selectedYear]);

  /*
   * YEAR TOTALS
   */

  const totalTicketValue = yearBookings.reduce(
    (sum, booking) =>
      sum + Number(booking.ticket_amount || 0),
    0
  );

  const totalCollected = yearBookings.reduce(
    (sum, booking) =>
      sum + Number(booking.paid_amount || 0),
    0
  );

  const totalProfit =
    totalCollected - totalTicketValue;

  const totalOutstanding = Math.max(
    totalTicketValue - totalCollected,
    0
  );

  /*
   * MONTHLY REPORT
   */

  const monthlyReport = useMemo(() => {
    return months.map((monthName, monthIndex) => {
      const monthBookings = yearBookings.filter(
        (booking) => {
          if (!booking.booking_date) {
            return false;
          }

          return (
            new Date(`${booking.booking_date}T00:00:00`).getMonth() === monthIndex
          );
        }
      );

      const ticketValue = monthBookings.reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.ticket_amount || 0
          ),
        0
      );

      const collected = monthBookings.reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.paid_amount || 0
          ),
        0
      );

      return {
        month: monthName,
        bookings: monthBookings.length,
        ticketValue,
        collected,
        profit: collected - ticketValue,
      };
    });
  }, [yearBookings]);

  /*
   * QUARTERLY REPORT
   */

  const quarterlyReport = useMemo(() => {
    return [0, 1, 2, 3].map(
      (quarterIndex) => {
        const quarterBookings =
          yearBookings.filter((booking) => {
            if (!booking.booking_date) {
              return false;
            }

            const month = new Date(`${booking.booking_date}T00:00:00`).getMonth();

            return (
              Math.floor(month / 3) ===
              quarterIndex
            );
          });

        const ticketValue =
          quarterBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.ticket_amount || 0
              ),
            0
          );

        const collected =
          quarterBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.paid_amount || 0
              ),
            0
          );

        return {
          quarter: `Q${quarterIndex + 1}`,
          bookings:
            quarterBookings.length,
          ticketValue,
          collected,
          profit:
            collected - ticketValue,
        };
      }
    );
  }, [yearBookings]);

  return (
    <main className="container">

      {/* HEADER */}

      <div className="row">

        <div>
          <h1 className="page-title">
            Reports
          </h1>

          <p className="muted">
            Business and profit reports
            based on Booking Date. Travel Date is used only for upcoming travel and reminders.
          </p>
        </div>

        <select
          className="input"
          style={{
            width: 150,
          }}
          value={selectedYear}
          onChange={(event) =>
            setSelectedYear(
              Number(event.target.value)
            )
          }
        >
          {availableYears.map((year) => (
            <option
              key={year}
              value={year}
            >
              {year}
            </option>
          ))}
        </select>

      </div>

      {/* ERROR */}

      {error && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div
        className="grid grid-4"
        style={{
          marginTop: 22,
        }}
      >

        <div className="card">
          <div className="stat-label">
            Total Bookings
          </div>

          <div className="stat-value">
            {loading
              ? "..."
              : yearBookings.length}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">
            Ticket Value
          </div>

          <div className="stat-value">
            {loading
              ? "..."
              : money(totalTicketValue)}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">
            Collected
          </div>

          <div className="stat-value">
            {loading
              ? "..."
              : money(totalCollected)}
          </div>
        </div>

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
            className="stat-value"
            style={{
              color:
                totalProfit >= 0
                  ? "green"
                  : "red",
            }}
          >
            {loading
              ? "..."
              : money(totalProfit)}
          </div>
        </div>

      </div>

      {/* OUTSTANDING */}

      <div
        className="card"
        style={{
          marginTop: 20,
        }}
      >

        <div className="row">

          <div>
            <div className="stat-label">
              Outstanding Customer Amount
            </div>

            <div className="stat-value">
              {money(totalOutstanding)}
            </div>
          </div>

          <strong>
            {selectedYear}
          </strong>

        </div>

      </div>

      {/* MONTHLY REPORT */}

      <section
        className="card"
        style={{
          marginTop: 24,
        }}
      >

        <h2
          style={{
            marginTop: 0,
          }}
        >
          Monthly Profit Report
        </h2>

        <p className="muted">
          Monthly performance for{" "}
          {selectedYear}
        </p>

        <div
          className="table-wrap"
          style={{
            marginTop: 16,
          }}
        >

          <table>

            <thead>

              <tr>
                <th>Month</th>
                <th>Bookings</th>
                <th>Ticket Price</th>
                <th>Collected</th>
                <th>Profit</th>
              </tr>

            </thead>

            <tbody>

              {monthlyReport.map(
                (month) => (
                  <tr
                    key={month.month}
                  >

                    <td>
                      <strong>
                        {month.month}
                      </strong>
                    </td>

                    <td>
                      {month.bookings}
                    </td>

                    <td>
                      {money(
                        month.ticketValue
                      )}
                    </td>

                    <td>
                      {money(
                        month.collected
                      )}
                    </td>

                    <td>
                      <strong
                        style={{
                          color:
                            month.profit >= 0
                              ? "green"
                              : "red",
                        }}
                      >
                        {money(
                          month.profit
                        )}
                      </strong>
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* QUARTERLY REPORT */}

      <section
        className="card"
        style={{
          marginTop: 24,
          marginBottom: 40,
        }}
      >

        <h2
          style={{
            marginTop: 0,
          }}
        >
          Quarterly Profit Report
        </h2>

        <p className="muted">
          Quarterly performance for{" "}
          {selectedYear}
        </p>

        <div
          className="table-wrap"
          style={{
            marginTop: 16,
          }}
        >

          <table>

            <thead>

              <tr>
                <th>Quarter</th>
                <th>Bookings</th>
                <th>Ticket Price</th>
                <th>Collected</th>
                <th>Profit</th>
              </tr>

            </thead>

            <tbody>

              {quarterlyReport.map(
                (quarter) => (
                  <tr
                    key={
                      quarter.quarter
                    }
                  >

                    <td>
                      <strong>
                        {quarter.quarter}
                      </strong>
                    </td>

                    <td>
                      {quarter.bookings}
                    </td>

                    <td>
                      {money(
                        quarter.ticketValue
                      )}
                    </td>

                    <td>
                      {money(
                        quarter.collected
                      )}
                    </td>

                    <td>
                      <strong
                        style={{
                          color:
                            quarter.profit >= 0
                              ? "green"
                              : "red",
                        }}
                      >
                        {money(
                          quarter.profit
                        )}
                      </strong>
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}