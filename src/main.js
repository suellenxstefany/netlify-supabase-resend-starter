import { supabase } from "./supabaseClient.js";

function setPre(id, value) {
  const el = document.getElementById(id);
  el.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

// Health check
document.getElementById("healthBtn").addEventListener("click", async () => {
  setPre("healthOut", "Loading...");
  try {
    const res = await fetch("/.netlify/functions/health");
    const data = await res.json();
    setPre("healthOut", { status: res.status, data });
  } catch (err) {
    setPre("healthOut", { ok: false, error: String(err) });
  }
});

// Send email via Resend
document.getElementById("emailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setPre("emailOut", "Sending...");

  const to = document.getElementById("to").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const message = document.getElementById("message").value.trim();

  try {
    const res = await fetch("/.netlify/functions/sendEmail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        text: message || "Hello from Netlify Functions + Resend!"
      })
    });

    const data = await res.json();
    setPre("emailOut", { status: res.status, data });
  } catch (err) {
    setPre("emailOut", { ok: false, error: String(err) });
  }
});

console.log("Supabase configured:", Boolean(supabase));
