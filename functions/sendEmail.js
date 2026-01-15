// Netlify Function: send an email via Resend
// Uses dotenv locally; in production, set env vars in Netlify.
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const MAX_BODY_BYTES = 20_000;
const MAX_SUBJECT_CHARS = 200;
const MAX_TEXT_CHARS = 10_000;
const MAX_HTML_CHARS = 20_000;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return supabaseAdmin;
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  };
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) return value;
  }
  return undefined;
}

function getClientIp(headers) {
  const netlifyIp = getHeader(headers, "x-nf-client-connection-ip");
  if (netlifyIp) return String(netlifyIp);

  const forwardedFor = getHeader(headers, "x-forwarded-for");
  if (forwardedFor) return String(forwardedFor).split(",")[0].trim();

  const realIp = getHeader(headers, "x-real-ip");
  if (realIp) return String(realIp);

  return null;
}

function hasControlChars(value) {
  return /[\u0000-\u001F\u007F]/.test(String(value));
}

function isValidEmail(email) {
  const value = String(email);
  if (value.length > 254) return false;
  if (hasControlChars(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateEmailRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object." };
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const html = typeof body.html === "string" ? body.html : "";
  const from = typeof body.from === "string" ? body.from.trim() : "";

  if (!to || !subject || (!text && !html)) {
    return { ok: false, error: "Missing required fields. Provide: to, subject, and text or html." };
  }

  if (!isValidEmail(to)) {
    return { ok: false, error: "Invalid `to` email address." };
  }

  if (subject.length > MAX_SUBJECT_CHARS || hasControlChars(subject)) {
    return { ok: false, error: "`subject` is too long or contains control characters." };
  }

  // Prevent header injection in optional `from`.
  if (from && hasControlChars(from)) {
    return { ok: false, error: "`from` contains control characters." };
  }

  if (text && text.length > MAX_TEXT_CHARS) {
    return { ok: false, error: "`text` is too long." };
  }

  if (html && html.length > MAX_HTML_CHARS) {
    return { ok: false, error: "`html` is too long." };
  }

  return { ok: true, body: { to, subject, text, html, from } };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed. Use POST." });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: "Request body too large." });
  }

  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body." });
  }

  const validation = validateEmailRequestBody(payload);
  if (!validation.ok) return json(400, { ok: false, error: validation.error });

  const body = validation.body;
  const ipAddress = getClientIp(event.headers);

  if (!process.env.RESEND_API_KEY) {
    return json(500, {
      ok: false,
      error: "Missing RESEND_API_KEY. Set it in `.env` (local) or Netlify env vars (prod)."
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return json(500, {
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in `.env` (local) or Netlify env vars (prod)."
    });
  }

  // Forensic logging: write an audit record before attempting to send.
  // This is service-role only (never expose the service role key to the browser).
  const { error: logError } = await supabase.from("system_logs").insert([
    {
      event_type: "EMAIL_DISPATCH",
      metadata: { to: body.to, subject: body.subject },
      ip_address: ipAddress
    }
  ]);

  // Fail closed: if we can't write the audit record, don't send the email.
  if (logError) {
    const responsePayload = { ok: false, error: "Failed to write audit log." };
    if (process.env.NODE_ENV !== "production") responsePayload.details = logError.message;
    return json(500, responsePayload);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    // For production, use a verified sender domain.
    from: body.from || "onboarding@resend.dev",
    to: body.to,
    subject: body.subject,
    text: body.text || undefined,
    html: body.html || undefined
  });

  if (error) {
    return json(502, { ok: false, error: error.message || "Resend error." });
  }

  return json(200, { ok: true, id: data?.id });
};
