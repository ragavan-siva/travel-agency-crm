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

type Service = {
  id: string;
  service_type: string;
  other_service_name: string | null;
  customer_name: string;
  service_date: string;
  collected_amount: number | null;
  cost_amount: number | null;
};

type MonthlyReport = {
  month: string;
  ticketProfit: number;
  serviceProfit: number;
  totalProfit: number;
};

type YearlyReport = {
  year: number;
  ticketProfit: number;
  serviceProfit: number;
  totalProfit: number;
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
    maximumFractionDigits: 0,
  })}`;
}

function getServiceName(service: Service) {
  if (
    service.service_type === "Other" &&
    service.other_service_name
  ) {
    return service.other_service_name;
  }

  return service.service_type;
}

function getYear(date: string) {
  return Number(date.slice(0, 4));
}

function getMonth(date: string) {
  return Number(date.slice(5, 7)) - 1;
}

function getQuarter(month: number) {
  return Math.floor(month / 3);
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * "all" = Overall / All Years
   * number = individual year
   */
  const [selectedYear, setSelectedYear] =
    useState<number | "all">("all");

  async function loadReports() {
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

      const bookingsResult = await supabase
        .from("bookings")
        .select(`
          id,
          departure_at,
          ticket_amount,
          paid_amount,
          booking_status
        `)
        .order("departure_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (bookingsResult.error) {
        throw bookingsResult.error;
      }

      const servicesResult = await supabase
        .from("services")
        .select(`
          id,
          service_type,
          other_service_name,
          customer_name,
          service_date,
          collected_amount,
          cost_amount
        `)
        .order("service_date", {
          ascending: false,
        });

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      setBookings(
        (bookingsResult.data as Booking[]) || []
      );

      setServices(
        (servicesResult.data as Service[]) || []
      );
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
    loadReports();

    const interval = setInterval(
      loadReports,
      30000
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * AVAILABLE YEARS
   */

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    bookings.forEach((booking) => {
      if (booking.departure_at) {
        years.add(
          getYear(booking.departure_at)
        );
      }
    });

    services.forEach((service) => {
      if (service.service_date) {
        years.add(
          getYear(service.service_date)
        );
      }
    });

    years.add(new Date().getFullYear());

    return Array.from(years).sort(
      (a, b) => b - a
    );
  }, [bookings, services]);

  /*
   * FILTERED BOOKINGS
   *
   * For tickets, Travel Date is currently
   * being treated as Booking Date as requested.
   */

  const filteredBookings = useMemo(() => {
    if (selectedYear === "all") {
      return bookings;
    }

    return bookings.filter((booking) => {
      if (!booking.departure_at) {
        return false;
      }

      return (
        getYear(booking.departure_at) ===
        selectedYear
      );
    });
  }, [bookings, selectedYear]);

  /*
   * FILTERED SERVICES
   */

  const filteredServices = useMemo(() => {
    if (selectedYear === "all") {
      return services;
    }

    return services.filter((service) => {
      if (!service.service_date) {
        return false;
      }

      return (
        getYear(service.service_date) ===
        selectedYear
      );
    });
  }, [services, selectedYear]);

  /*
   * TICKET TOTALS
   */

  const ticketValue = useMemo(() => {
    return filteredBookings.reduce(
      (sum, booking) =>
        sum +
        Number(booking.ticket_amount || 0),
      0
    );
  }, [filteredBookings]);

  const ticketCollected = useMemo(() => {
    return filteredBookings.reduce(
      (sum, booking) =>
        sum +
        Number(booking.paid_amount || 0),
      0
    );
  }, [filteredBookings]);

  const ticketProfit =
    ticketCollected - ticketValue;

  /*
   * SERVICE TOTALS
   */

  const serviceCollected = useMemo(() => {
    return filteredServices.reduce(
      (sum, service) =>
        sum +
        Number(
          service.collected_amount || 0
        ),
      0
    );
  }, [filteredServices]);

  const serviceCost = useMemo(() => {
    return filteredServices.reduce(
      (sum, service) =>
        sum +
        Number(service.cost_amount || 0),
      0
    );
  }, [filteredServices]);

  const serviceProfit =
    serviceCollected - serviceCost;

  /*
   * OVERALL BUSINESS
   */

  const totalProfit =
    ticketProfit + serviceProfit;

  const totalTransactions =
    filteredBookings.length +
    filteredServices.length;

  /*
   * SERVICE-WISE PERFORMANCE
   */

  const serviceWise = useMemo(() => {
    const map = new Map<
      string,
      {
        jobs: number;
        collected: number;
        cost: number;
        profit: number;
      }
    >();

    filteredServices.forEach((service) => {
      const name =
        getServiceName(service);

      const existing =
        map.get(name) || {
          jobs: 0,
          collected: 0,
          cost: 0,
          profit: 0,
        };

      const collected = Number(
        service.collected_amount || 0
      );

      const cost = Number(
        service.cost_amount || 0
      );

      existing.jobs += 1;
      existing.collected += collected;
      existing.cost += cost;
      existing.profit +=
        collected - cost;

      map.set(name, existing);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        ...value,
      }))
      .sort(
        (a, b) =>
          b.profit - a.profit
      );
  }, [filteredServices]);

  /*
   * MONTHLY REPORT
   *
   * When Overall is selected:
   * combines January from all years,
   * February from all years, etc.
   */

  const monthlyReport = useMemo(() => {
    return months.map(
      (monthName, monthIndex) => {
        const monthBookings =
          filteredBookings.filter(
            (booking) =>
              booking.departure_at &&
              getMonth(
                booking.departure_at
              ) === monthIndex
          );

        const monthServices =
          filteredServices.filter(
            (service) =>
              getMonth(
                service.service_date
              ) === monthIndex
          );

        const monthTicketValue =
          monthBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.ticket_amount || 0
              ),
            0
          );

        const monthTicketCollected =
          monthBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.paid_amount || 0
              ),
            0
          );

        const monthTicketProfit =
          monthTicketCollected -
          monthTicketValue;

        const monthServiceCollected =
          monthServices.reduce(
            (sum, service) =>
              sum +
              Number(
                service.collected_amount ||
                  0
              ),
            0
          );

        const monthServiceCost =
          monthServices.reduce(
            (sum, service) =>
              sum +
              Number(
                service.cost_amount || 0
              ),
            0
          );

        const monthServiceProfit =
          monthServiceCollected -
          monthServiceCost;

        return {
          month: monthName,
          ticketProfit:
            monthTicketProfit,
          serviceProfit:
            monthServiceProfit,
          totalProfit:
            monthTicketProfit +
            monthServiceProfit,
        };
      }
    );
  }, [
    filteredBookings,
    filteredServices,
  ]);

  /*
   * QUARTERLY REPORT
   */

  const quarterlyReport = useMemo(() => {
    return [0, 1, 2, 3].map(
      (quarterIndex) => {
        const quarterMonths = [
          quarterIndex * 3,
          quarterIndex * 3 + 1,
          quarterIndex * 3 + 2,
        ];

        const data =
          monthlyReport.filter(
            (_, index) =>
              quarterMonths.includes(index)
          );

        const ticketProfit =
          data.reduce(
            (sum, item) =>
              sum + item.ticketProfit,
            0
          );

        const serviceProfit =
          data.reduce(
            (sum, item) =>
              sum + item.serviceProfit,
            0
          );

        return {
          quarter: `Q${
            quarterIndex + 1
          }`,
          ticketProfit,
          serviceProfit,
          totalProfit:
            ticketProfit +
            serviceProfit,
        };
      }
    );
  }, [monthlyReport]);

  /*
   * YEARLY REPORT
   *
   * Used mainly when Overall is selected.
   */

  const yearlyReport = useMemo(() => {
    return availableYears
      .map((year) => {
        const yearBookings =
          bookings.filter(
            (booking) =>
              booking.departure_at &&
              getYear(
                booking.departure_at
              ) === year
          );

        const yearServices =
          services.filter(
            (service) =>
              service.service_date &&
              getYear(
                service.service_date
              ) === year
          );

        const yearTicketValue =
          yearBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.ticket_amount || 0
              ),
            0
          );

        const yearTicketCollected =
          yearBookings.reduce(
            (sum, booking) =>
              sum +
              Number(
                booking.paid_amount || 0
              ),
            0
          );

        const yearTicketProfit =
          yearTicketCollected -
          yearTicketValue;

        const yearServiceCollected =
          yearServices.reduce(
            (sum, service) =>
              sum +
              Number(
                service.collected_amount ||
                  0
              ),
            0
          );

        const yearServiceCost =
          yearServices.reduce(
            (sum, service) =>
              sum +
              Number(
                service.cost_amount || 0
              ),
            0
          );

        const yearServiceProfit =
          yearServiceCollected -
          yearServiceCost;

        return {
          year,
          ticketProfit:
            yearTicketProfit,
          serviceProfit:
            yearServiceProfit,
          totalProfit:
            yearTicketProfit +
            yearServiceProfit,
        };
      })
      .sort(
        (a, b) => b.year - a.year
      );
  }, [availableYears, bookings, services]);

  /*
   * GRAPH MAXIMUMS
   */

  const maxMonthlyProfit =
    Math.max(
      ...monthlyReport.map((item) =>
        Math.abs(item.totalProfit)
      ),
      1
    );

  const maxYearlyProfit =
    Math.max(
      ...yearlyReport.map((item) =>
        Math.abs(item.totalProfit)
      ),
      1
    );

  /*
   * DISPLAY LABEL
   */

  const reportTitle =
    selectedYear === "all"
      ? "All-Time Business Performance"
      : `${selectedYear} Business Performance`;

  if (loading) {
    return (
      <main className="container">
        <div className="card">
          <p className="muted">
            Loading business reports...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container reports-page">

      {/* =====================================
          HEADER
          ===================================== */}

      <div className="page-header">
        <div>
          <h1 className="page-title">
            Business Reports
          </h1>

          <p className="muted">
            Complete business performance,
            profitability and service analysis.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <select
            className="input"
            style={{
              width: 190,
            }}
            value={
              selectedYear === "all"
                ? "all"
                : selectedYear
            }
            onChange={(e) => {
              if (e.target.value === "all") {
                setSelectedYear("all");
              } else {
                setSelectedYear(
                  Number(e.target.value)
                );
              }
            }}
          >
            <option value="all">
              Overall / All Years
            </option>

            {availableYears.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>

          <button
            className="btn secondary"
            onClick={loadReports}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginTop: 18,
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================
          REPORT PERIOD
          ===================================== */}

      <div
        className="card"
        style={{
          marginTop: 24,
          background:
            "linear-gradient(135deg, #0f172a, #1e293b)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.7,
              }}
            >
              REPORT PERIOD
            </div>

            <h2
              style={{
                margin:
                  "6px 0 0",
                color: "white",
              }}
            >
              {reportTitle}
            </h2>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 13,
                opacity: 0.7,
              }}
            >
              TOTAL PROFIT
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                marginTop: 3,
              }}
            >
              {money(totalProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================
          EXECUTIVE OVERVIEW
          ===================================== */}

      <section
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-section-title">
          <div>
            <h2>
              Executive Overview
            </h2>

            <p className="muted">
              Key business performance
              indicators
            </p>
          </div>
        </div>

        <div
          className="grid grid-4"
          style={{
            marginTop: 14,
          }}
        >
          <div className="card report-stat">
            <span className="muted">
              Total Transactions
            </span>

            <strong>
              {totalTransactions}
            </strong>

            <small>
              Tickets + Services
            </small>
          </div>

          <div className="card report-stat">
            <span className="muted">
              Ticket Profit
            </span>

            <strong>
              {money(ticketProfit)}
            </strong>

            <small>
              Flight bookings
            </small>
          </div>

          <div className="card report-stat">
            <span className="muted">
              Service Profit
            </span>

            <strong>
              {money(serviceProfit)}
            </strong>

            <small>
              Other services
            </small>
          </div>

          <div className="card report-stat report-stat-highlight">
            <span className="muted">
              Total Business Profit
            </span>

            <strong>
              {money(totalProfit)}
            </strong>

            <small>
              Tickets + Services
            </small>
          </div>
        </div>
      </section>

      {/* =====================================
          ALL-TIME YEARLY GRAPH
          ===================================== */}

      {selectedYear === "all" &&
        yearlyReport.length > 0 && (
          <section
            className="card report-panel"
            style={{
              marginTop: 24,
            }}
          >
            <div className="report-panel-header">
              <div>
                <h2>
                  Profit by Year
                </h2>

                <p className="muted">
                  All-time business
                  profitability
                </p>
              </div>
            </div>

            <div
              className="profit-chart"
              style={{
                marginTop: 25,
              }}
            >
              {yearlyReport.map(
                (item) => {
                  const height =
                    Math.max(
                      (Math.abs(
                        item.totalProfit
                      ) /
                        maxYearlyProfit) *
                        100,
                      item.totalProfit === 0
                        ? 2
                        : 5
                    );

                  return (
                    <div
                      className="profit-chart-column"
                      key={item.year}
                    >
                      <div className="profit-chart-value">
                        {item.totalProfit !==
                        0
                          ? money(
                              item.totalProfit
                            )
                          : ""}
                      </div>

                      <div className="profit-chart-bar-area">
                        <div
                          className="profit-chart-bar"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <span>
                        {item.year}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

      {/* =====================================
          MONTHLY PROFIT
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Monthly Profit Performance
            </h2>

            <p className="muted">
              {selectedYear === "all"
                ? "Combined monthly performance across all years"
                : `Monthly performance for ${selectedYear}`}
            </p>
          </div>
        </div>

        <div
          className="profit-chart"
          style={{
            marginTop: 25,
          }}
        >
          {monthlyReport.map(
            (item) => {
              const height =
                Math.max(
                  (Math.abs(
                    item.totalProfit
                  ) /
                    maxMonthlyProfit) *
                    100,
                  item.totalProfit === 0
                    ? 2
                    : 5
                );

              return (
                <div
                  className="profit-chart-column"
                  key={item.month}
                >
                  <div className="profit-chart-value">
                    {item.totalProfit !==
                    0
                      ? money(
                          item.totalProfit
                        )
                      : ""}
                  </div>

                  <div className="profit-chart-bar-area">
                    <div
                      className="profit-chart-bar"
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <span>
                    {item.month.slice(
                      0,
                      3
                    )}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* =====================================
          TICKET BOOKINGS
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Ticket Bookings
            </h2>

            <p className="muted">
              Flight booking financial
              performance
            </p>
          </div>
        </div>

        <div
          className="grid grid-4"
          style={{
            marginTop: 20,
          }}
        >
          <div className="report-mini-stat">
            <span>
              Total Bookings
            </span>

            <strong>
              {filteredBookings.length}
            </strong>
          </div>

          <div className="report-mini-stat">
            <span>
              Ticket Value
            </span>

            <strong>
              {money(ticketValue)}
            </strong>
          </div>

          <div className="report-mini-stat">
            <span>
              Collected
            </span>

            <strong>
              {money(ticketCollected)}
            </strong>
          </div>

          <div className="report-mini-stat">
            <span>
              Profit
            </span>

            <strong>
              {money(ticketProfit)}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================
          OTHER SERVICES
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Other Services
            </h2>

            <p className="muted">
              RMI, VISA, Attestation,
              Dummy Ticket and other
              services
            </p>
          </div>
        </div>

        <div
          className="grid grid-3"
          style={{
            marginTop: 20,
          }}
        >
          <div className="report-mini-stat">
            <span>
              Total Services
            </span>

            <strong>
              {filteredServices.length}
            </strong>
          </div>

          <div className="report-mini-stat">
            <span>
              Service Cost
            </span>

            <strong>
              {money(serviceCost)}
            </strong>
          </div>

          <div className="report-mini-stat">
            <span>
              Service Profit
            </span>

            <strong>
              {money(serviceProfit)}
            </strong>
          </div>
        </div>
      </section>

      {/* =====================================
          SERVICE-WISE PERFORMANCE
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Service-wise Performance
            </h2>

            <p className="muted">
              Detailed profitability
              by service
            </p>
          </div>
        </div>

        {serviceWise.length === 0 ? (
          <p
            className="muted"
            style={{
              marginTop: 20,
            }}
          >
            No service records found
            for this period.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: 20,
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Service
                  </th>

                  <th>
                    Jobs
                  </th>

                  <th>
                    Collected
                  </th>

                  <th>
                    Cost
                  </th>

                  <th>
                    Profit
                  </th>
                </tr>
              </thead>

              <tbody>
                {serviceWise.map(
                  (item) => (
                    <tr
                      key={item.name}
                    >
                      <td>
                        <strong>
                          {item.name}
                        </strong>
                      </td>

                      <td>
                        {item.jobs}
                      </td>

                      <td>
                        {money(
                          item.collected
                        )}
                      </td>

                      <td>
                        {money(
                          item.cost
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            item.profit
                          )}
                        </strong>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================
          MONTHLY TABLE
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Monthly Performance
            </h2>

            <p className="muted">
              Profit contribution by
              month
            </p>
          </div>
        </div>

        <div
          style={{
            overflowX: "auto",
            marginTop: 20,
          }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  Month
                </th>

                <th>
                  Ticket Profit
                </th>

                <th>
                  Service Profit
                </th>

                <th>
                  Total Profit
                </th>
              </tr>
            </thead>

            <tbody>
              {monthlyReport.map(
                (item) => (
                  <tr key={item.month}>
                    <td>
                      <strong>
                        {item.month}
                      </strong>
                    </td>

                    <td>
                      {money(
                        item.ticketProfit
                      )}
                    </td>

                    <td>
                      {money(
                        item.serviceProfit
                      )}
                    </td>

                    <td>
                      <strong>
                        {money(
                          item.totalProfit
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

      {/* =====================================
          YEARLY PERFORMANCE
          ===================================== */}

      {selectedYear === "all" && (
        <section
          className="card report-panel"
          style={{
            marginTop: 24,
          }}
        >
          <div className="report-panel-header">
            <div>
              <h2>
                Yearly Performance
              </h2>

              <p className="muted">
                Complete business
                performance by year
              </p>
            </div>
          </div>

          <div
            style={{
              overflowX: "auto",
              marginTop: 20,
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Year
                  </th>

                  <th>
                    Ticket Profit
                  </th>

                  <th>
                    Service Profit
                  </th>

                  <th>
                    Total Profit
                  </th>
                </tr>
              </thead>

              <tbody>
                {yearlyReport.map(
                  (item) => (
                    <tr key={item.year}>
                      <td>
                        <strong>
                          {item.year}
                        </strong>
                      </td>

                      <td>
                        {money(
                          item.ticketProfit
                        )}
                      </td>

                      <td>
                        {money(
                          item.serviceProfit
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            item.totalProfit
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
      )}

      {/* =====================================
          QUARTERLY PERFORMANCE
          ===================================== */}

      <section
        className="card report-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="report-panel-header">
          <div>
            <h2>
              Quarterly Performance
            </h2>

            <p className="muted">
              Business profit by
              quarter
            </p>
          </div>
        </div>

        <div
          className="grid grid-4"
          style={{
            marginTop: 20,
          }}
        >
          {quarterlyReport.map(
            (item) => (
              <div
                className="quarter-card"
                key={item.quarter}
              >
                <span>
                  {item.quarter}
                </span>

                <strong>
                  {money(
                    item.totalProfit
                  )}
                </strong>

                <small>
                  Ticket:{" "}
                  {money(
                    item.ticketProfit
                  )}
                </small>

                <small>
                  Services:{" "}
                  {money(
                    item.serviceProfit
                  )}
                </small>
              </div>
            )
          )}
        </div>
      </section>

    </main>
  );
}