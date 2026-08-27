"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Booking = {
  id: string;
  departure_at: string | null;
  ticket_amount: number | null;
  paid_amount: number | null;
  booking_status: string | null;
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

const monthNames = [
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

export default function ReportsPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedYear, setSelectedYear] =
    useState(new Date().getFullYear());

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadReports() {
    try {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Please login to view reports."
        );
        return;
      }

      const { data, error } =
        await supabase
          .from("bookings")
          .select(`
            id,
            departure_at,
            ticket_amount,
            paid_amount,
            booking_status
          `)
          .order("departure_at", {
            ascending: true,
            nullsFirst: false,
          });

      if (error) {
        throw error;
      }

      setBookings(
        (data as Booking[]) || []
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();

    const interval = setInterval(
      loadReports,
      30000
    );

    return () =>
      clearInterval(interval);
  }, []);

  const availableYears =
    useMemo(() => {
      const years = bookings
        .filter(
          (booking) =>
            booking.departure_at
        )
        .map(
          (booking) =>
            new Date(
              booking.departure_at!
            ).getFullYear()
        );

      years.push(
        new Date().getFullYear()
      );

      return Array.from(
        new Set(years)
      ).sort((a, b) => b - a);
    }, [bookings]);

  /*
   * ONLY BOOKINGS FROM SELECTED YEAR
   */

  const yearBookings =
    bookings.filter((booking) => {
      if (!booking.departure_at) {
        return false;
      }

      return (
        new Date(
          booking.departure_at
        ).getFullYear() === selectedYear
      );
    });

  /*
   * TOTAL YEAR VALUES
   */

  const totalTicketValue =
    yearBookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.ticket_amount || 0
        ),
      0
    );

  const totalCollected =
    yearBookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.paid_amount || 0
        ),
      0
    );

  const totalProfit =
    totalCollected -
    totalTicketValue;

  const totalOutstanding =
    Math.max(
      totalTicketValue -
        totalCollected,
      0
    );

  /*
   * MONTHLY REPORT
   */

  const monthlyReport =
    useMemo(() => {
      return monthNames.map(
        (name, monthIndex) => {

          const monthBookings =
            yearBookings.filter(
              (booking) => {
                if (
                  !booking.departure_at
                ) {
                  return false;
                }

                return (
                  new Date(
                    booking.departure_at
                  ).getMonth() ===
                  monthIndex
                );
              }
            );

          const ticketValue =
            monthBookings.reduce(
              (sum, booking) =>
                sum +
                Number(
                  booking.ticket_amount ||
                    0
                ),
              0
            );

          const collected =
            monthBookings.reduce(
              (sum, booking) =>
                sum +
                Number(
                  booking.paid_amount ||
                    0
                ),
              0
            );

          return {
            name,
            bookings:
              monthBookings.length,
            ticketValue,
            collected,
            profit:
              collected -
              ticketValue,
          };
        }
      );
    }, [yearBookings]);

  /*
   * QUARTERLY REPORT
   */

  const quarterlyReport =
    useMemo(() => {
      return [0, 1, 2, 3].map(
        (quarterIndex) => {

          const quarterBookings =
            yearBookings.filter(
              (booking) => {
                if (
                  !booking.departure_at
                ) {
                  return false;
                }

                const month =
                  new Date(
                    booking.departure_at
                  ).getMonth();

                return (
                  Math.floor(
                    month / 3
                  ) === quarterIndex
                );
              }
            );

          const ticketValue =
            quarterBookings.reduce(
              (sum, booking) =>
                sum +
                Number(
                  booking.ticket_amount ||
                    0
                ),
              0
            );

          const collected =
            quarterBookings.reduce(
              (sum, booking) =>
                sum +
                Number(
                  booking.paid_amount ||
                    0
                ),
              0
            );

          return {
            quarter:
              `Q${quarterIndex + 1}`,
            bookings:
              quarterBookings.length,
            ticketValue,
            collected,
            profit:
              collected -
              ticketValue,
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
            Profit and business performance
            based on Travel Date.
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

          {availableYears.map(
            (year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            )
          )}

        </select>

      </div>

      {errorMessage && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* YEAR SUMMARY */}

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

          <div className="muted">
            {selectedYear}
          </div>

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
          January to December — {selectedYear}
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

                <th>
                  Month
                </th>

                <th>
                  Bookings
                </th>

                <th>
                  Ticket Price
                </th>

                <th>
                  Collected
                </th>

                <th>
                  Profit
                </th>

              </tr>

            </thead>

            <tbody>

              {monthlyReport.map(
                (month) => (
                  <tr
                    key={month.name}
                  >

                    <td>
                      <strong>
                        {month.name}
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
          Business performance by quarter —
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

                <th>
                  Quarter
                </th>

                <th>
                  Bookings
                </th>

                <th>
                  Ticket Price
                </th>

                <th>
                  Collected
                </th>

                <th>
                  Profit
                </th>

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