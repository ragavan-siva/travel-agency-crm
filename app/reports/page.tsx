"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Booking = {
  id: string;
  booking_date: string | null;
  departure_at: string | null;
  ticket_amount: number | null;
  paid_amount: number | null;
  booking_status: string | null;
  booking_reference: string | null;
  booking_type: string | null;
  origin: string | null;
  destination: string | null;
  customer_id: string | null;
  customers:
    | {
        full_name: string | null;
        phone: string | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
      }[]
    | null;
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

type MonthlyTransaction = {
  id: string;
  type: "Ticket" | "Service";
  date: string;
  customer: string;
  details: string;
  ticketValue: number;
  collected: number;
  cost: number;
  profit: number;
  travelDate: string | null;
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

function formatDate(date: string | null) {
  if (!date) return "-";

  if (date.length === 10) {
    const parsed = new Date(`${date}T00:00:00`);

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

  /*
   * Click a month to open all transactions
   * belonging to that month.
   */
  const [selectedMonth, setSelectedMonth] =
    useState<number | null>(null);

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

      /*
       * IMPORTANT:
       *
       * booking_date = Booking Date
       * departure_at = Travel Date
       *
       * Reports MUST use booking_date.
       * departure_at is only kept here for other future uses.
       */
      const bookingsResult = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          departure_at,
          ticket_amount,
          paid_amount,
          booking_status,
          booking_reference,
          booking_type,
          origin,
          destination,
          customer_id,
          customers (
            full_name,
            phone
          )
        `)
        .order("booking_date", {
          ascending: false,
          nullsFirst: false,
        });

      if (bookingsResult.error) {
        throw bookingsResult.error;
      }

      /*
       * Services use service_date.
       */
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
   *
   * Ticket years come from BOOKING DATE.
   * Service years come from SERVICE DATE.
   */
  const availableYears = useMemo(() => {
    const years = new Set<number>();

    bookings.forEach((booking) => {
      if (booking.booking_date) {
        years.add(
          getYear(booking.booking_date)
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
   * VERY IMPORTANT:
   * Ticket reports are filtered using BOOKING DATE.
   *
   * NOT departure_at.
   */
  const filteredBookings = useMemo(() => {
    if (selectedYear === "all") {
      return bookings;
    }

    return bookings.filter((booking) => {
      if (!booking.booking_date) {
        return false;
      }

      return (
        getYear(booking.booking_date) ===
        selectedYear
      );
    });
  }, [bookings, selectedYear]);

  /*
   * FILTERED SERVICES
   *
   * Services are filtered using SERVICE DATE.
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

  /*
   * Ticket Profit
   *
   * Collected - Ticket Value
   */
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
   * Ticket month = BOOKING DATE
   * Service month = SERVICE DATE
   *
   * When Overall is selected:
   * January = January from all years
   * February = February from all years
   * etc.
   */
  const monthlyReport = useMemo(() => {
    return months.map(
      (monthName, monthIndex) => {
        /*
         * BOOKING DATE USED HERE
         */
        const monthBookings =
          filteredBookings.filter(
            (booking) =>
              booking.booking_date &&
              getMonth(
                booking.booking_date
              ) === monthIndex
          );

        /*
         * SERVICE DATE USED HERE
         */
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
   *
   * Based on monthly report.
   *
   * Ticket data inside monthly report
   * already uses BOOKING DATE.
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
   * IMPORTANT:
   * Ticket year = BOOKING DATE.
   * Service year = SERVICE DATE.
   */
  const yearlyReport = useMemo(() => {
    return availableYears
      .map((year) => {
        /*
         * BOOKING DATE USED HERE
         */
        const yearBookings =
          bookings.filter(
            (booking) =>
              booking.booking_date &&
              getYear(
                booking.booking_date
              ) === year
          );

        /*
         * SERVICE DATE USED HERE
         */
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
   * MONTHLY TRANSACTION DRILL-DOWN
   *
   * Ticket month = Booking Date
   * Service month = Service Date
   *
   * If Overall / All Years is selected,
   * the selected month includes that month
   * from every year.
   */
  const selectedMonthTransactions =
    useMemo<MonthlyTransaction[]>(() => {
      if (selectedMonth === null) {
        return [];
      }

      const monthBookings =
        filteredBookings.filter(
          (booking) =>
            booking.booking_date &&
            getMonth(
              booking.booking_date
            ) === selectedMonth
        );

      const monthServices =
        filteredServices.filter(
          (service) =>
            service.service_date &&
            getMonth(
              service.service_date
            ) === selectedMonth
        );

      const ticketTransactions =
        monthBookings.map((booking) => {
          const ticketValue = Number(
            booking.ticket_amount || 0
          );

          const collected = Number(
            booking.paid_amount || 0
          );

          const customer =
            Array.isArray(booking.customers)
              ? booking.customers[0]
              : booking.customers;

          const route = `${booking.origin || "-"} → ${
            booking.destination || "-"
          }`;

          const reference =
            booking.booking_reference
              ? ` • ${booking.booking_reference}`
              : "";

          return {
            id: `ticket-${booking.id}`,
            type: "Ticket" as const,
            date: booking.booking_date || "",
            customer:
              customer?.full_name ||
              "Unknown Customer",
            details:
              `${route}${reference}`,
            ticketValue,
            collected,
            cost: 0,
            profit:
              collected - ticketValue,
            travelDate:
              booking.departure_at,
          };
        });

      const serviceTransactions =
        monthServices.map((service) => {
          const collected = Number(
            service.collected_amount || 0
          );

          const cost = Number(
            service.cost_amount || 0
          );

          return {
            id: `service-${service.id}`,
            type: "Service" as const,
            date: service.service_date || "",
            customer:
              service.customer_name ||
              "Unknown Customer",
            details:
              getServiceName(service),
            ticketValue: 0,
            collected,
            cost,
            profit: collected - cost,
            travelDate: null,
          };
        });

      return [
        ...ticketTransactions,
        ...serviceTransactions,
      ].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
    }, [
      filteredBookings,
      filteredServices,
      selectedMonth,
    ]);

  const selectedMonthReport =
    selectedMonth === null
      ? null
      : monthlyReport[selectedMonth];

  /*
   * Select / deselect a month.
   *
   * Scrolling is handled in a separate useEffect
   * AFTER React renders the transaction panel.
   */
  function selectMonth(monthIndex: number) {
    setSelectedMonth((current) =>
      current === monthIndex
        ? null
        : monthIndex
    );
  }

  /*
   * React must render the selected-month panel first.
   * Then scroll to it. This fixes the issue where the
   * old setTimeout ran before the element existed.
   */
  useEffect(() => {
    if (selectedMonth === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      document
        .getElementById("monthly-transactions")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [selectedMonth]);

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
                (item, index) => (
                  <tr
                    key={item.month}
                    onClick={() =>
                      selectMonth(index)
                    }
                    style={{
                      cursor: "pointer",
                      background:
                        selectedMonth === index
                          ? "#f1f5f9"
                          : undefined,
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectMonth(index);
                        }}
                        style={{
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          font: "inherit",
                          textAlign: "left",
                          color: "#0f172a",
                        }}
                      >
                        <strong>
                          {item.month}
                        </strong>

                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginTop: 3,
                          }}
                        >
                          Click to view transactions
                        </div>
                      </button>
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
          SELECTED MONTH TRANSACTIONS
          ===================================== */}

      {selectedMonth !== null &&
        selectedMonthReport && (
          <section
            id="monthly-transactions"
            className="card report-panel"
            style={{
              marginTop: 24,
              marginBottom: 24,
              border: "1px solid #cbd5e1",
              scrollMarginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {selectedMonthReport.month} Transactions
                </h2>

                <p className="muted">
                  {selectedYear === "all"
                    ? `All years • ${selectedMonthTransactions.length} transactions`
                    : `${selectedYear} • ${selectedMonthTransactions.length} transactions`}
                  {" • "}
                  Booking Date / Service Date
                </p>
              </div>

              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setSelectedMonth(null)
                }
              >
                Close
              </button>
            </div>

            <div
              className="grid grid-4"
              style={{ marginTop: 20 }}
            >
              <div className="report-mini-stat">
                <span>Transactions</span>
                <strong>
                  {selectedMonthTransactions.length}
                </strong>
              </div>

              <div className="report-mini-stat">
                <span>Ticket Bookings</span>
                <strong>
                  {selectedMonthReport.ticketProfit === 0 &&
                  selectedMonthTransactions.filter(
                    (item) => item.type === "Ticket"
                  ).length === 0
                    ? 0
                    : selectedMonthTransactions.filter(
                        (item) => item.type === "Ticket"
                      ).length}
                </strong>
              </div>

              <div className="report-mini-stat">
                <span>Service Jobs</span>
                <strong>
                  {selectedMonthTransactions.filter(
                    (item) => item.type === "Service"
                  ).length}
                </strong>
              </div>

              <div className="report-mini-stat">
                <span>Total Profit</span>
                <strong>
                  {money(
                    selectedMonthReport.totalProfit
                  )}
                </strong>
              </div>
            </div>

            {selectedMonthTransactions.length === 0 ? (
              <div
                style={{
                  marginTop: 20,
                  padding: 28,
                  borderRadius: 12,
                  background: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <p className="muted">
                  No transactions found for this month.
                </p>
              </div>
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
                      <th>Date</th>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Details</th>
                      <th>Travel Date</th>
                      <th>Ticket Value</th>
                      <th>Collected</th>
                      <th>Cost</th>
                      <th>Profit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedMonthTransactions.map(
                      (transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            {formatDate(
                              transaction.date
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 9px",
                                borderRadius: 999,
                                background:
                                  transaction.type ===
                                  "Ticket"
                                    ? "#eef2ff"
                                    : "#ecfdf5",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {transaction.type}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {transaction.customer}
                            </strong>
                          </td>

                          <td>
                            {transaction.details}
                          </td>

                          <td>
                            {transaction.type === "Ticket"
                              ? formatDate(
                                  transaction.travelDate
                                )
                              : "-"}
                          </td>

                          <td>
                            {transaction.type === "Ticket"
                              ? money(
                                  transaction.ticketValue
                                )
                              : "-"}
                          </td>

                          <td>
                            {money(
                              transaction.collected
                            )}
                          </td>

                          <td>
                            {transaction.type === "Service"
                              ? money(
                                  transaction.cost
                                )
                              : "-"}
                          </td>

                          <td>
                            <strong
                              style={{
                                color:
                                  transaction.profit >= 0
                                    ? "green"
                                    : "red",
                              }}
                            >
                              {money(
                                transaction.profit
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
        )}

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