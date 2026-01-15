# Netlify + Supabase + Resend (Minimal Starter)

Production-friendly starter repo:
- Netlify (static site + serverless functions)
- Netlify Functions (Node.js, CommonJS)
- Supabase (Postgres) via `@supabase/supabase-js`
- Tailwind CSS via CDN (no build step)
- Environment variables via `dotenv` (functions)
- Email via Resend

## Project structure

```
/
├── netlify.toml
├── package.json
├── .env.example
├── .gitignore
├── functions/
│   ├── health.js
│   └── sendEmail.js
├── src/
│   ├── index.html
│   ├── main.js
│   ├── styles.css
│   └── supabaseClient.js
└── README.md
```

## Setup

1) Install dependencies:

```bash
npm install
```

2) Create a local `.env` (for local dev only):

```bash
cp .env.example .env
```

3) Update Supabase browser config:
- Edit `src/index.html` and replace `window.__ENV.SUPABASE_URL` + `window.__ENV.SUPABASE_ANON_KEY`.

## Audit logging (Supabase)

The `sendEmail` function writes an audit row to `system_logs` *before* sending via Resend.

Run this in the Supabase SQL Editor:

```sql
-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.system_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  event_type text not null,
  metadata jsonb,
  ip_address text
);

alter table public.system_logs enable row level security;

-- No anon/auth policies: they can't read/write any rows when RLS is enabled.
revoke all on table public.system_logs from public;
revoke all on table public.system_logs from anon, authenticated;

-- Service role (server-side only) can write/read logs.
grant insert, select on table public.system_logs to service_role;

create policy "service_role_insert_logs"
  on public.system_logs for insert
  to service_role
  with check (true);

create policy "service_role_read_logs"
  on public.system_logs for select
  to service_role
  using (true);
```

## Local dev

Runs a local static server + functions:

```bash
npx netlify-cli@21.6.0 dev
```

## Endpoints

- `GET /.netlify/functions/health`
- `POST /.netlify/functions/sendEmail`
  - JSON body: `{ "to": "you@example.com", "subject": "Hi", "text": "Hello" }`

## Deploying to Netlify

In Netlify:
- Set build settings: publish directory `src`, functions directory `functions` (also in `netlify.toml`)
- Set environment variables (functions):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`

Notes:
- `RESEND_API_KEY` is server-side only (functions).
- Never put a Supabase service role key in the frontend.
