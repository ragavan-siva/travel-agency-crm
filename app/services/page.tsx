"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase";

type Service = {
  id: string;
  service_type: string;
  other_service_name: string | null;
  customer_name: string;
  service_date: string;
  collected_amount: number | null;
  cost_amount: number | null;
  created_at: string;
};

type ServiceForm = {
  serviceType: string;
  otherServiceName: string;
  customerName: string;
  serviceDate: string;
  collectedAmount: string;
  costAmount: string;
};

const serviceOptions = [
  "RMI",
  "VISA",
  "Attestation",
  "Dummy Ticket",
  "Other",
];

const initialForm: ServiceForm = {
  serviceType: "RMI",
  otherServiceName: "",
  customerName: "",
  serviceDate: "",
  collectedAmount: "",
  costAmount: "",
};

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [viewingService, setViewingService] =
    useState<Service | null>(null);

  const [form, setForm] =
    useState<ServiceForm>({
      ...initialForm,
      serviceDate: today(),
    });

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] =
    useState("all");

  const [message, setMessage] = useState("");

  async function loadServices() {
    try {
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setServices([]);
        setMessage("Please login to view services.");
        return;
      }

      const { data, error } = await supabase
        .from("services")
        .select(`
          id,
          service_type,
          other_service_name,
          customer_name,
          service_date,
          collected_amount,
          cost_amount,
          created_at
        `)
        .order("service_date", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setServices((data as Service[]) || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load services."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function updateForm(
    field: keyof ServiceForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openNewService() {
    setEditingService(null);
    setViewingService(null);

    setForm({
      ...initialForm,
      serviceDate: today(),
    });

    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingService(null);

    setForm({
      ...initialForm,
      serviceDate: today(),
    });
  }

  function editService(service: Service) {
    setEditingService(service);
    setViewingService(null);

    setForm({
      serviceType: service.service_type,
      otherServiceName:
        service.other_service_name || "",
      customerName: service.customer_name,
      serviceDate: service.service_date,
      collectedAmount: String(
        service.collected_amount || ""
      ),
      costAmount: String(
        service.cost_amount || ""
      ),
    });

    setMessage("");
    setShowForm(true);
  }

  async function saveService(
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
          "Please login before saving a service."
        );
      }

      if (
        form.serviceType === "Other" &&
        !form.otherServiceName.trim()
      ) {
        throw new Error(
          "Please enter the service name."
        );
      }

      const collected =
        Number(form.collectedAmount) || 0;

      const cost =
        Number(form.costAmount) || 0;

      const serviceData = {
        service_type: form.serviceType,
        other_service_name:
          form.serviceType === "Other"
            ? form.otherServiceName.trim()
            : null,
        customer_name:
          form.customerName.trim(),
        service_date: form.serviceDate,
        collected_amount: collected,
        cost_amount: cost,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);

        if (error) {
          throw error;
        }

        setMessage(
          `Service updated successfully. Profit: ${money(
            collected - cost
          )}`
        );
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);

        if (error) {
          throw error;
        }

        setMessage(
          `Service added successfully. Profit: ${money(
            collected - cost
          )}`
        );
      }

      closeForm();
      await loadServices();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save service."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(service: Service) {
    const confirmed = window.confirm(
      `Delete ${getServiceName(service)} for ${service.customer_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) {
        throw error;
      }

      setMessage("Service deleted successfully.");

      await loadServices();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete service."
      );
    }
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

  const filteredServices = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return services.filter((service) => {
      const serviceName =
        getServiceName(service).toLowerCase();

      const matchesSearch =
        !query ||
        service.customer_name
          .toLowerCase()
          .includes(query) ||
        serviceName.includes(query);

      const matchesFilter =
        serviceFilter === "all" ||
        service.service_type === serviceFilter;

      return matchesSearch && matchesFilter;
    });
  }, [services, search, serviceFilter]);

  const totalCollected = services.reduce(
    (sum, service) =>
      sum +
      Number(service.collected_amount || 0),
    0
  );

  const totalCost = services.reduce(
    (sum, service) =>
      sum + Number(service.cost_amount || 0),
    0
  );

  const totalProfit =
    totalCollected - totalCost;

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Other Services
          </h1>

          <p className="muted">
            Manage RMI, VISA, Attestation,
            Dummy Ticket and other services.
          </p>
        </div>

        <button
          className="btn"
          onClick={openNewService}
        >
          + New Service
        </button>
      </div>

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

      {showForm && (
        <form
          className="card"
          style={{
            marginTop: 20,
          }}
          onSubmit={saveService}
        >
          <div className="row">
            <div>
              <h2 style={{ margin: 0 }}>
                {editingService
                  ? "Edit Service"
                  : "New Service"}
              </h2>

              <p className="muted">
                Enter the service details.
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

          <div
            className="grid grid-2"
            style={{
              marginTop: 20,
            }}
          >
            <div className="field">
              <label className="label">
                Service *
              </label>

              <select
                className="input"
                value={form.serviceType}
                onChange={(e) =>
                  updateForm(
                    "serviceType",
                    e.target.value
                  )
                }
              >
                {serviceOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {form.serviceType === "Other" && (
              <div className="field">
                <label className="label">
                  Other Service Name *
                </label>

                <input
                  className="input"
                  required
                  value={form.otherServiceName}
                  onChange={(e) =>
                    updateForm(
                      "otherServiceName",
                      e.target.value
                    )
                  }
                  placeholder="Enter service name"
                />
              </div>
            )}

            <div className="field">
              <label className="label">
                Name *
              </label>

              <input
                className="input"
                required
                value={form.customerName}
                onChange={(e) =>
                  updateForm(
                    "customerName",
                    e.target.value
                  )
                }
                placeholder="Customer name"
              />
            </div>

            <div className="field">
              <label className="label">
                Date *
              </label>

              <input
                className="input"
                type="date"
                required
                value={form.serviceDate}
                onChange={(e) =>
                  updateForm(
                    "serviceDate",
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
                placeholder="0"
              />
            </div>

            <div className="field">
              <label className="label">
                Cost *
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.costAmount}
                onChange={(e) =>
                  updateForm(
                    "costAmount",
                    e.target.value
                  )
                }
                placeholder="0"
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <span className="muted">
              Profit
            </span>

            <h2
              style={{
                margin: "5px 0 0",
              }}
            >
              {money(
                (Number(
                  form.collectedAmount
                ) || 0) -
                  (Number(
                    form.costAmount
                  ) || 0)
              )}
            </h2>
          </div>

          <div
            style={{
              marginTop: 20,
            }}
          >
            <button
              className="btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingService
                ? "Update Service"
                : "Save Service"}
            </button>
          </div>
        </form>
      )}

      <div
        className="grid grid-3"
        style={{
          marginTop: 20,
        }}
      >
        <div className="card">
          <span className="muted">
            Services
          </span>

          <h2>
            {services.length}
          </h2>
        </div>

        <div className="card">
          <span className="muted">
            Collected
          </span>

          <h2>
            {money(totalCollected)}
          </h2>
        </div>

        <div className="card">
          <span className="muted">
            Profit
          </span>

          <h2>
            {money(totalProfit)}
          </h2>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 20,
        }}
      >
        <div
          className="grid grid-2"
          style={{
            marginBottom: 18,
          }}
        >
          <input
            className="input"
            placeholder="Search customer or service..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <select
            className="input"
            value={serviceFilter}
            onChange={(e) =>
              setServiceFilter(e.target.value)
            }
          >
            <option value="all">
              All Services
            </option>

            {serviceOptions.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="muted">
            Loading services...
          </p>
        ) : filteredServices.length === 0 ? (
          <p className="muted">
            No services found.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Collected</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service) => {
                    const collected =
                      Number(
                        service.collected_amount ||
                          0
                      );

                    const cost =
                      Number(
                        service.cost_amount ||
                          0
                      );

                    const profit =
                      collected - cost;

                    return (
                      <tr key={service.id}>
                        <td>
                          {formatDate(
                            service.service_date
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              service.customer_name
                            }
                          </strong>
                        </td>

                        <td>
                          {getServiceName(
                            service
                          )}
                        </td>

                        <td>
                          {money(collected)}
                        </td>

                        <td>
                          {money(cost)}
                        </td>

                        <td>
                          <strong>
                            {money(profit)}
                          </strong>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              className="btn secondary"
                              type="button"
                              onClick={() =>
                                setViewingService(
                                  service
                                )
                              }
                            >
                              View
                            </button>

                            <button
                              className="btn secondary"
                              type="button"
                              onClick={() =>
                                editService(
                                  service
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="btn secondary"
                              type="button"
                              onClick={() =>
                                deleteService(
                                  service
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
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingService && (
        <div className="card">
          <div className="row">
            <div>
              <h2 style={{ margin: 0 }}>
                Service Details
              </h2>

              <p className="muted">
                Complete service information
              </p>
            </div>

            <button
              className="btn secondary"
              onClick={() =>
                setViewingService(null)
              }
            >
              Close
            </button>
          </div>

          <div
            className="grid grid-2"
            style={{
              marginTop: 20,
            }}
          >
            <div>
              <span className="muted">
                Service
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {getServiceName(
                  viewingService
                )}
              </strong>
            </div>

            <div>
              <span className="muted">
                Name
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {viewingService.customer_name}
              </strong>
            </div>

            <div>
              <span className="muted">
                Date
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {formatDate(
                  viewingService.service_date
                )}
              </strong>
            </div>

            <div>
              <span className="muted">
                Collected
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {money(
                  Number(
                    viewingService.collected_amount ||
                      0
                  )
                )}
              </strong>
            </div>

            <div>
              <span className="muted">
                Cost
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {money(
                  Number(
                    viewingService.cost_amount ||
                      0
                  )
                )}
              </strong>
            </div>

            <div>
              <span className="muted">
                Profit
              </span>

              <strong
                style={{
                  display: "block",
                }}
              >
                {money(
                  Number(
                    viewingService.collected_amount ||
                      0
                  ) -
                    Number(
                      viewingService.cost_amount ||
                        0
                    )
                )}
              </strong>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}