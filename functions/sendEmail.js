// Netlify Function: send an email via Resend
// Uses dotenv locally; in production, set env vars in Netlify.
require("dotenv").config();

const { Resend } = require("resend");

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed. Use POST." });
  }

  if (!process.env.RESEND_API_KEY) {
    return json(500, {
      ok: false,
      error: "Missing RESEND_API_KEY. Set it in `.env` (local) or Netlify env vars (prod)."
    });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body." });
  }

  const to = payload.to;
  const subject = payload.subject;
  const text = payload.text;
  const html = payload.html;

  if (!to || !subject || (!text && !html)) {
    return json(400, {
      ok: false,
      error: "Missing required fields. Provide: to, subject, and text or html."
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    // For production, use a verified sender domain.
    from: payload.from || "onboarding@resend.dev",
    to,
    subject,
    text,
    html
  });

  if (error) {
    return json(502, { ok: false, error: error.message || "Resend error." });
  }

  return json(200, { ok: true, id: data?.id });
};
