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
  - `RESEND_API_KEY`

Notes:
- `RESEND_API_KEY` is server-side only (functions).
- Never put a Supabase service role key in the frontend.
