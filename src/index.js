import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();

// Stripe requires RAW body when verifying signatures,
// but we are NOT verifying signatures here.
// So JSON body is safe.
app.use(bodyParser.json({ limit: "10mb" }));
app.use(cors());

// =======================================================
// HEALTH CHECK
// =======================================================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AG3 Orchestrator – Render Deployment Version",
    webhook: "Ready"
  });
});

// =======================================================
// WEBHOOK ENDPOINT (no signature verification)
// =======================================================
app.post("/webhook", (req, res) => {
  try {
    console.log("⚡ Incoming webhook event:", req.body);

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// =======================================================
// START SERVER
// =======================================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 AG3 Orchestrator running on PORT ${PORT}`);
});
