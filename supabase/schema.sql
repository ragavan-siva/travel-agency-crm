-- Travel Agency CRM initial database
create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  booking_reference text unique,
  pnr text,
  ticket_number text,
  airline text,
  flight_number text,
  origin text,
  destination text,
  departure_at timestamptz,
  arrival_at timestamptz,
  passenger_count integer default 1,
  ticket_amount numeric(12,2) default 0,
  paid_amount numeric(12,2) default 0,
  payment_method text,
  booking_status text not null default 'confirmed',
  payment_status text not null default 'pending',
  ticket_pdf_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_departure_idx on bookings(departure_at);
create index if not exists bookings_pnr_idx on bookings(pnr);
create index if not exists customers_phone_idx on customers(phone);

alter table customers enable row level security;
alter table bookings enable row level security;

-- For the first private MVP, authenticated users can access CRM rows.
create policy "authenticated users can read customers"
on customers for select to authenticated using (true);

create policy "authenticated users can insert customers"
on customers for insert to authenticated with check (true);

create policy "authenticated users can update customers"
on customers for update to authenticated using (true) with check (true);

create policy "authenticated users can read bookings"
on bookings for select to authenticated using (true);

create policy "authenticated users can insert bookings"
on bookings for insert to authenticated with check (true);

create policy "authenticated users can update bookings"
on bookings for update to authenticated using (true) with check (true);
