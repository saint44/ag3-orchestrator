const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data", "replies");
fs.mkdirSync(DATA_DIR, { recursive: true });

const LOG_FILE = path.join(DATA_DIR, "log.jsonl");

function classify(text = "") {
  const t = text.toLowerCase();
  if (t.includes("yes") || t.includes("interested")) return "INTERESTED";
  if (t.includes("no") || t.includes("not interested")) return "NOT_INTERESTED";
  return "QUESTION";
}

function log(payload) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(payload) + "\n");
}

async function checkReplies() {
  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASS,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT),
      tls: true,
      authTimeout: 10000,
    },
  };

  const connection = await imaps.connect(config);
  await connection.openBox("INBOX");

  const searchCriteria = ["UNSEEN"];
  const fetchOptions = { bodies: [""] };

  const messages = await connection.search(searchCriteria, fetchOptions);

  for (const msg of messages) {
    const parsed = await simpleParser(msg.parts[0].body);
    const text = parsed.text || "";

    const classification = classify(text);

    log({
      ts: new Date().toISOString(),
      from: parsed.from?.text,
      subject: parsed.subject,
      classification,
      snippet: text.slice(0, 300),
    });

    console.log(`[REPLY] ${classification} ← ${parsed.from?.text}`);
  }

  await connection.end();
}

module.exports = { checkReplies };
