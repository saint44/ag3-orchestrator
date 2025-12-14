/**
 * Reply Controller
 * ----------------
 * Safely ingests email replies via IMAP (Gmail)
 * - Non-fatal on errors
 * - TLS-tolerant
 * - Never crashes the orchestrator
 */

const fs = require("fs");
const path = require("path");
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");

const DATA_DIR = path.join(__dirname, "..", "data", "replies");
const LOG_FILE = path.join(DATA_DIR, "log.jsonl");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function classify(text = "") {
  const t = text.toLowerCase();
  if (t.includes("yes") || t.includes("interested")) return "INTERESTED";
  if (t.includes("no") || t.includes("not interested")) return "NOT_INTERESTED";
  return "QUESTION";
}

async function checkReplies() {
  ensureDir();

  // IMAP config (TLS-tolerant for Gmail)
  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASS,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT),
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false
      },
      authTimeout: 10000
    }
  };

  let connection;

  try {
    connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: [""],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (!messages || messages.length === 0) {
      // Normal case — no replies yet
      return;
    }

    for (const msg of messages) {
      const raw = msg.parts[0]?.body;
      if (!raw) continue;

      const parsed = await simpleParser(raw);
      const text = parsed.text || "";

      const entry = {
        ts: new Date().toISOString(),
        from: parsed.from?.text || "unknown",
        subject: parsed.subject || "",
        classification: classify(text),
        snippet: text.slice(0, 300)
      };

      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
      console.log(`[REPLY] ${entry.classification} ← ${entry.from}`);
    }
  } catch (err) {
    // NEVER crash the system
    console.error("[REPLY] IMAP error (non-fatal):", err.message);
  } finally {
    try {
      if (connection) connection.end();
    } catch (_) {}
  }
}

module.exports = { checkReplies };
