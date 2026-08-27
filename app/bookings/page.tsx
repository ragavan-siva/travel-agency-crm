"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  payment_method: string | null;
  payment_status: string | null;
  booking_status: string | null;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers: Customer | null;
};

type BookingRow = Omit<Booking, "customers"> & {
  customers: Customer | Customer[] | null;
};

type BookingForm = {
  fullName: string;
  phone: string;
  email: string;
  bookingType: string;
  travelDate: string;
  origin: string;
  destination: string;
  passengerCount: string;
  ticketPrice: string;
  collectedAmount: string;
  paymentMethod: string;
  bookingStatus: string;
  notes: string;
};

const initialForm: BookingForm = {
  fullName: "",
  phone: "",
  email: "",
  bookingType: "Single",
  travelDate: "",
  origin: "",
  destination: "",
  passengerCount: "1",
  ticketPrice: "",
  collectedAmount: "",
  paymentMethod: "UPI",
  bookingStatus: "confirmed",
  notes: "",
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN");
}

function dateForInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCustomer(
  customers: Customer | Customer[] | null
): Customer | null {
  if (Array.isArray(customers)) {
    return customers[0] || null;
  }

  return customers;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] =
    useState<Booking | null>(null);

  const [viewingBooking, setViewingBooking] =
    useState<Booking | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] =
    useState<BookingForm>(initialForm);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBookings() {
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Please login before viewing bookings.");
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
          payment_method,
          payment_status,
          booking_status,
          notes,
          created_at,
          customer_id,
          customers (
            id,
            full_name,
            phone,
            email
          )
        `)
        .order("departure_at", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        throw error;
      }

      const rows = (data as BookingRow[]) || [];

      const normalizedBookings: Booking[] =
        rows.map((booking) => ({
          ...booking,
          customers: getCustomer(
            booking.customers
          ),
        }));

      setBookings(normalizedBookings);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  function updateForm(
    field: keyof BookingForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewBooking() {
    setEditingBooking(null);
    setViewingBooking(null);
    setForm(initialForm);
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingBooking(null);
    setForm(initialForm);
  }

  function editBooking(booking: Booking) {
    setEditingBooking(booking);
    setViewingBooking(null);

    setForm({
      fullName:
        booking.customers?.full_name || "",

      phone:
        booking.customers?.phone || "",

      email:
        booking.customers?.email || "",

      bookingType:
        booking.booking_type || "Single",

      travelDate:
        dateForInput(booking.departure_at),

      origin:
        booking.origin || "",

      destination:
        booking.destination || "",

      passengerCount:
        String(booking.passenger_count || 1),

      ticketPrice:
        String(booking.ticket_amount || ""),

      collectedAmount:
        String(booking.paid_amount || ""),

      paymentMethod:
        booking.payment_method || "UPI",

      bookingStatus:
        booking.booking_status || "confirmed",

      notes:
        booking.notes || "",
    });

    setMessage("");
    setShowForm(true);
  }

  async function saveBooking(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please login before creating a booking."
        );
      }

      let customerId =
        editingBooking?.customer_id || null;

      /*
       * UPDATE EXISTING CUSTOMER
       */

      if (customerId) {
        const { error } = await supabase
          .from("customers")
          .update({
            full_name: form.fullName.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
          })
          .eq("id", customerId);

        if (error) {
          throw error;
        }
      }

      /*
       * FIND EXISTING CUSTOMER
       */

      if (!customerId && form.phone.trim()) {
        const {
          data: existingCustomer,
          error: customerSearchError,
        } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", form.phone.trim())
          .maybeSingle();

        if (customerSearchError) {
          throw customerSearchError;
        }

        customerId =
          existingCustomer?.id || null;
      }

      /*
       * CREATE NEW CUSTOMER
       */

      if (!customerId) {
        const {
          data: newCustomer,
          error: customerError,
        } = await supabase
          .from("customers")
          .insert({
            full_name: form.fullName.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
          })
          .select("id")
          .single();

        if (customerError) {
          throw customerError;
        }

        customerId = newCustomer.id;
      }

      /*
       * MONEY
       */

      const ticketPrice =
        Number(form.ticketPrice) || 0;

      const collectedAmount =
        Number(form.collectedAmount) || 0;

      const profit =
        collectedAmount - ticketPrice;

      const balance = Math.max(
        ticketPrice - collectedAmount,
        0
      );

      let paymentStatus = "pending";

      if (
        ticketPrice > 0 &&
        collectedAmount >= ticketPrice
      ) {
        paymentStatus = "paid";
      } else if (collectedAmount > 0) {
        paymentStatus = "partial";
      }

      /*
       * TRAVEL DATE
       */

      let departureAt: string | null = null;

      if (form.travelDate) {
        departureAt = new Date(
          `${form.travelDate}T00:00:00`
        ).toISOString();
      }

      /*
       * BOOKING DATA
       */

      const bookingData = {
        customer_id: customerId,
        booking_type: form.bookingType,
        origin: form.origin.trim() || null,
        destination:
          form.destination.trim() || null,
        departure_at: departureAt,
        passenger_count:
          Number(form.passengerCount) || 1,
        ticket_amount: ticketPrice,
        paid_amount: collectedAmount,
        payment_method: form.paymentMethod,
        payment_status: paymentStatus,
        booking_status: form.bookingStatus,
        notes: form.notes.trim() || null,
      };

      /*
       * UPDATE
       */

      if (editingBooking) {
        const { error } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", editingBooking.id);

        if (error) {
          throw error;
        }

        setMessage(
          `Booking updated successfully. Profit: ${money(
            profit
          )}. Balance: ${money(balance)}`
        );
      }

      /*
       * CREATE
       */

      else {
        const bookingReference =
          "TRV-" +
          Date.now().toString().slice(-8);

        const { error } = await supabase
          .from("bookings")
          .insert({
            ...bookingData,
            booking_reference:
              bookingReference,
          });

        if (error) {
          throw error;
        }

        setMessage(
          `Booking ${bookingReference} created successfully. Profit: ${money(
            profit
          )}. Balance: ${money(balance)}`
        );
      }

      closeForm();

      await loadBookings();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save booking."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * DELETE
   */

  async function deleteBooking(
    booking: Booking
  ) {
    const customerName =
      booking.customers?.full_name ||
      "this customer";

    const confirmed = window.confirm(
      `Are you sure you want to delete the booking for ${customerName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      if (error) {
        throw error;
      }

      if (
        viewingBooking?.id ===
        booking.id
      ) {
        setViewingBooking(null);
      }

      setMessage(
        "Booking deleted successfully."
      );

      await loadBookings();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete booking."
      );
    }
  }

  /*
   * SEARCH
   */

  const filteredBookings =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return bookings.filter(
        (booking) => {
          const customer =
            booking.customers;

          const searchableText = [
            booking.booking_reference,
            customer?.full_name,
            customer?.phone,
            booking.origin,
            booking.destination,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(query);

          const matchesType =
            typeFilter === "all" ||
            booking.booking_type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      bookings,
      search,
      typeFilter,
    ]);

  /*
   * FORM CALCULATIONS
   */

  const ticketPrice =
    Number(form.ticketPrice) || 0;

  const collectedAmount =
    Number(form.collectedAmount) || 0;

  const profit =
    collectedAmount - ticketPrice;

  const balance = Math.max(
    ticketPrice - collectedAmount,
    0
  );

  return (
    <main className="container">

      {/* HEADER */}

      <div className="row">

        <div>
          <h1 className="page-title">
            Bookings
          </h1>

          <p className="muted">
            Manage your customer's
            travel bookings.
          </p>
        </div>

        <button
          className="btn"
          onClick={openNewBooking}
        >
          + New Booking
        </button>

      </div>

      {/* MESSAGE */}

      {message && (
        <div
          className="card"
          style={{
            marginTop: 18,
          }}
        >
          {message}
        </div>
      )}

      {/* FORM */}

      {showForm && (
        <form
          className="card"
          style={{
            marginTop: 20,
          }}
          onSubmit={saveBooking}
        >

          <div className="row">

            <div>
              <h2 style={{ margin: 0 }}>
                {editingBooking
                  ? "Edit Booking"
                  : "New Booking"}
              </h2>

              <p className="muted">
                Enter the customer's
                travel information.
              </p>
            </div>

            <button
              type="button"
              className="btn secondary"
              onClick={closeForm}
            >
              Cancel
            </button>

          </div>

          {/* CUSTOMER */}

          <h3 style={{ marginTop: 24 }}>
            Customer
          </h3>

          <div className="grid grid-2">

            <div className="field">

              <label className="label">
                Name *
              </label>

              <input
                className="input"
                required
                value={form.fullName}
                onChange={(e) =>
                  updateForm(
                    "fullName",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                Phone *
              </label>

              <input
                className="input"
                required
                value={form.phone}
                onChange={(e) =>
                  updateForm(
                    "phone",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                Email
              </label>

              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) =>
                  updateForm(
                    "email",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* TRAVEL */}

          <h3 style={{ marginTop: 24 }}>
            Travel Details
          </h3>

          <div className="grid grid-2">

            <div className="field">

              <label className="label">
                Type *
              </label>

              <select
                className="input"
                value={form.bookingType}
                onChange={(e) =>
                  updateForm(
                    "bookingType",
                    e.target.value
                  )
                }
              >

                <option value="Single">
                  Single
                </option>

                <option value="Double">
                  Double
                </option>

              </select>

            </div>

            <div className="field">

              <label className="label">
                Travel Date *
              </label>

              <input
                className="input"
                type="date"
                required
                value={form.travelDate}
                onChange={(e) =>
                  updateForm(
                    "travelDate",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                From
              </label>

              <input
                className="input"
                placeholder="Chennai"
                value={form.origin}
                onChange={(e) =>
                  updateForm(
                    "origin",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                To
              </label>

              <input
                className="input"
                placeholder="Dubai"
                value={form.destination}
                onChange={(e) =>
                  updateForm(
                    "destination",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                Passengers
              </label>

              <input
                className="input"
                type="number"
                min="1"
                value={form.passengerCount}
                onChange={(e) =>
                  updateForm(
                    "passengerCount",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* PAYMENT */}

          <h3 style={{ marginTop: 24 }}>
            Payment & Profit
          </h3>

          <div className="grid grid-2">

            <div className="field">

              <label className="label">
                Ticket Price *
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.ticketPrice}
                onChange={(e) =>
                  updateForm(
                    "ticketPrice",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                Collected Amount *
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.collectedAmount}
                onChange={(e) =>
                  updateForm(
                    "collectedAmount",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="field">

              <label className="label">
                Payment Method
              </label>

              <select
                className="input"
                value={form.paymentMethod}
                onChange={(e) =>
                  updateForm(
                    "paymentMethod",
                    e.target.value
                  )
                }
              >

                <option value="UPI">
                  UPI
                </option>

                <option value="Cash">
                  Cash
                </option>

                <option value="Bank Transfer">
                  Bank Transfer
                </option>

                <option value="Card">
                  Card
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>

          </div>

          {/* CALCULATION */}

          <div
            className="card"
            style={{
              marginTop: 20,
              marginBottom: 20,
              background:
                profit >= 0
                  ? "#ecfdf5"
                  : "#fef2f2",
            }}
          >

            <div className="grid grid-3">

              <div>
                <div className="stat-label">
                  Ticket Price
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {money(ticketPrice)}
                </div>
              </div>

              <div>
                <div className="stat-label">
                  Collected
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {money(collectedAmount)}
                </div>
              </div>

              <div>
                <div className="stat-label">
                  Profit
                </div>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color:
                      profit >= 0
                        ? "green"
                        : "red",
                  }}
                >
                  {money(profit)}
                </div>
              </div>

            </div>

            <div style={{ marginTop: 12 }}>
              Outstanding Balance:{" "}
              <strong>
                {money(balance)}
              </strong>
            </div>

          </div>

          {/* OTHER */}

          <h3>
            Other
          </h3>

          <div className="grid grid-2">

            <div className="field">

              <label className="label">
                Booking Status
              </label>

              <select
                className="input"
                value={form.bookingStatus}
                onChange={(e) =>
                  updateForm(
                    "bookingStatus",
                    e.target.value
                  )
                }
              >

                <option value="confirmed">
                  Confirmed
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

              </select>

            </div>

            <div className="field">

              <label className="label">
                Notes
              </label>

              <input
                className="input"
                value={form.notes}
                onChange={(e) =>
                  updateForm(
                    "notes",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <button
            type="submit"
            className="btn"
            disabled={saving}
            style={{
              marginTop: 16,
            }}
          >
            {saving
              ? "Saving..."
              : editingBooking
              ? "Update Booking"
              : "Save Booking"}
          </button>

        </form>
      )}

      {/* SEARCH */}

      {!showForm && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >

          <div className="grid grid-2">

            <input
              className="input"
              placeholder="Search customer, phone, from or destination..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <select
              className="input"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
            >

              <option value="all">
                All Types
              </option>

              <option value="Single">
                Single
              </option>

              <option value="Double">
                Double
              </option>

            </select>

          </div>

        </div>
      )}

      {/* TABLE */}

      {!showForm && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Travel Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Ticket Price</th>
                  <th>Collected</th>
                  <th>Profit</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>
                    <td
                      colSpan={9}
                      className="muted"
                    >
                      Loading bookings...
                    </td>
                  </tr>

                ) : filteredBookings.length === 0 ? (

                  <tr>
                    <td
                      colSpan={9}
                      className="muted"
                    >
                      No bookings found.
                    </td>
                  </tr>

                ) : (

                  filteredBookings.map(
                    (booking) => {
                      const ticket =
                        Number(
                          booking.ticket_amount ||
                            0
                        );

                      const collected =
                        Number(
                          booking.paid_amount ||
                            0
                        );

                      const bookingProfit =
                        collected - ticket;

                      return (
                        <tr
                          key={booking.id}
                        >

                          <td>
                            <strong>
                              {booking.customers
                                ?.full_name ||
                                "Unknown"}
                            </strong>

                            <br />

                            <span className="muted">
                              {booking.customers
                                ?.phone ||
                                ""}
                            </span>
                          </td>

                          <td>
                            {booking.booking_type ||
                              "Single"}
                          </td>

                          <td>
                            {formatDate(
                              booking.departure_at
                            )}
                          </td>

                          <td>
                            {booking.origin ||
                              "-"}
                          </td>

                          <td>
                            {booking.destination ||
                              "-"}
                          </td>

                          <td>
                            {money(ticket)}
                          </td>

                          <td>
                            {money(collected)}
                          </td>

                          <td>
                            <strong
                              style={{
                                color:
                                  bookingProfit >=
                                  0
                                    ? "green"
                                    : "red",
                              }}
                            >
                              {money(
                                bookingProfit
                              )}
                            </strong>
                          </td>

                          <td>

                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >

                              <button
                                className="btn secondary"
                                onClick={() =>
                                  setViewingBooking(
                                    booking
                                  )
                                }
                              >
                                View
                              </button>

                              <button
                                className="btn secondary"
                                onClick={() =>
                                  editBooking(
                                    booking
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="btn danger"
                                onClick={() =>
                                  deleteBooking(
                                    booking
                                  )
                                }
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* VIEW */}

      {viewingBooking && (
        <div
          className="card"
          style={{
            marginTop: 20,
          }}
        >

          <div className="row">

            <div>
              <h2 style={{ margin: 0 }}>
                Booking Details
              </h2>

              <p className="muted">
                {viewingBooking.booking_reference ||
                  ""}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >

              <button
                className="btn secondary"
                onClick={() =>
                  editBooking(
                    viewingBooking
                  )
                }
              >
                Edit
              </button>

              <button
                className="btn danger"
                onClick={() =>
                  deleteBooking(
                    viewingBooking
                  )
                }
              >
                Delete
              </button>

              <button
                className="btn secondary"
                onClick={() =>
                  setViewingBooking(null)
                }
              >
                Close
              </button>

            </div>

          </div>

          <div
            className="grid grid-2"
            style={{
              marginTop: 20,
            }}
          >

            <div>
              <div className="stat-label">
                Customer
              </div>

              <strong>
                {viewingBooking.customers
                  ?.full_name ||
                  "-"}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Phone
              </div>

              <strong>
                {viewingBooking.customers
                  ?.phone ||
                  "-"}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Type
              </div>

              <strong>
                {viewingBooking.booking_type ||
                  "Single"}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Travel Date
              </div>

              <strong>
                {formatDate(
                  viewingBooking.departure_at
                )}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                From
              </div>

              <strong>
                {viewingBooking.origin ||
                  "-"}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                To
              </div>

              <strong>
                {viewingBooking.destination ||
                  "-"}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Passengers
              </div>

              <strong>
                {viewingBooking.passenger_count ||
                  1}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Ticket Price
              </div>

              <strong>
                {money(
                  Number(
                    viewingBooking.ticket_amount ||
                      0
                  )
                )}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Collected
              </div>

              <strong>
                {money(
                  Number(
                    viewingBooking.paid_amount ||
                      0
                  )
                )}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Profit
              </div>

              <strong
                style={{
                  color:
                    Number(
                      viewingBooking.paid_amount ||
                        0
                    ) -
                      Number(
                        viewingBooking.ticket_amount ||
                          0
                      ) >=
                    0
                      ? "green"
                      : "red",
                }}
              >
                {money(
                  Number(
                    viewingBooking.paid_amount ||
                      0
                  ) -
                    Number(
                      viewingBooking.ticket_amount ||
                        0
                    )
                )}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Balance
              </div>

              <strong>
                {money(
                  Math.max(
                    Number(
                      viewingBooking.ticket_amount ||
                        0
                    ) -
                      Number(
                        viewingBooking.paid_amount ||
                          0
                      ),
                    0
                  )
                )}
              </strong>
            </div>

            <div>
              <div className="stat-label">
                Payment Status
              </div>

              <span className="badge">
                {viewingBooking.payment_status ||
                  "pending"}
              </span>
            </div>

            <div>
              <div className="stat-label">
                Booking Status
              </div>

              <span className="badge">
                {viewingBooking.booking_status ||
                  "confirmed"}
              </span>
            </div>

          </div>

          {viewingBooking.notes && (
            <div
              style={{
                marginTop: 20,
              }}
            >

              <div className="stat-label">
                Notes
              </div>

              <p>
                {viewingBooking.notes}
              </p>

            </div>
          )}

        </div>
      )}

    </main>
  );
}