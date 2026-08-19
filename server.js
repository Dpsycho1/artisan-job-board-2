// server.js
// The whole backend for the Artisan/Graduate Job Board.
// One Express app: serves the static frontend AND the JSON API.
// Database: SQLite (see db.js). No separate database server needed.

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------

// Generates a short, easy-to-read code the poster keeps so they can later
// view applications or delete their own post. There is no login system,
// so this code stands in for "proof this post is mine".
function generateManageCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "3F9A2C1B"
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function publicJob(row, applicationCount) {
  return {
    id: row.id,
    title: row.title,
    posterName: row.poster_name,
    category: row.category,
    jobType: row.job_type,
    state: row.state,
    lga: row.lga,
    payAmount: row.pay_amount,
    description: row.description,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
    applicationCount: applicationCount || 0
  };
}

// ---------- routes ----------

// List / search / filter jobs
app.get("/api/jobs", (req, res) => {
  const { search, category, state, jobType } = req.query;

  let query = `
    SELECT jobs.*, COUNT(applications.id) AS application_count
    FROM jobs
    LEFT JOIN applications ON applications.job_id = jobs.id
    WHERE 1 = 1
  `;
  const params = [];

  if (search && search.trim() !== "") {
    query += ` AND (title LIKE ? OR description LIKE ? OR poster_name LIKE ?)`;
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }
  if (category && category !== "all") {
    query += ` AND category = ?`;
    params.push(category);
  }
  if (state && state !== "all") {
    query += ` AND state = ?`;
    params.push(state);
  }
  if (jobType && jobType !== "all") {
    query += ` AND job_type = ?`;
    params.push(jobType);
  }

  query += ` GROUP BY jobs.id ORDER BY jobs.created_at DESC`;

  const rows = db.prepare(query).all(...params);
  const jobs = rows.map((row) => publicJob(row, row.application_count));
  res.json({ jobs });
});

// Get one job
app.get("/api/jobs/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found." });

  const countRow = db
    .prepare("SELECT COUNT(*) AS c FROM applications WHERE job_id = ?")
    .get(req.params.id);

  res.json({ job: publicJob(row, countRow.c) });
});

// Create a job posting
app.post("/api/jobs", (req, res) => {
  const {
    title,
    posterName,
    category,
    jobType,
    state,
    lga,
    payAmount,
    description,
    contactPhone,
    contactWhatsapp,
    contactEmail
  } = req.body || {};

  const required = { title, posterName, category, jobType, state, description, contactPhone };
  for (const [key, value] of Object.entries(required)) {
    if (isBlank(value)) {
      return res.status(400).json({ error: `"${key}" is required.` });
    }
  }
  if (String(title).length > 120) {
    return res.status(400).json({ error: "Title is too long (max 120 characters)." });
  }
  if (String(description).length > 3000) {
    return res.status(400).json({ error: "Description is too long (max 3000 characters)." });
  }

  const manageCode = generateManageCode();

  const stmt = db.prepare(`
    INSERT INTO jobs
      (title, poster_name, category, job_type, state, lga, pay_amount,
       description, contact_phone, contact_whatsapp, contact_email, manage_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    String(title).trim(),
    String(posterName).trim(),
    String(category).trim(),
    String(jobType).trim(),
    String(state).trim(),
    lga ? String(lga).trim() : null,
    payAmount ? String(payAmount).trim() : null,
    String(description).trim(),
    String(contactPhone).trim(),
    contactWhatsapp ? String(contactWhatsapp).trim() : null,
    contactEmail ? String(contactEmail).trim() : null,
    manageCode
  );

  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ job: publicJob(row, 0), manageCode });
});

// Delete a job posting (poster must supply their manage code)
app.delete("/api/jobs/:id", (req, res) => {
  const { manageCode } = req.body || {};
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Job not found." });
  if (isBlank(manageCode) || manageCode.toUpperCase() !== row.manage_code) {
    return res.status(403).json({ error: "That management code does not match this post." });
  }
  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Apply to a job
app.post("/api/jobs/:id/apply", (req, res) => {
  const job = db.prepare("SELECT id FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });

  const { applicantName, applicantPhone, applicantEmail, coverNote, portfolioLink } = req.body || {};
  if (isBlank(applicantName) || isBlank(applicantPhone)) {
    return res.status(400).json({ error: "Name and phone number are required to apply." });
  }
  if (coverNote && String(coverNote).length > 1500) {
    return res.status(400).json({ error: "Cover note is too long (max 1500 characters)." });
  }

  db.prepare(`
    INSERT INTO applications (job_id, applicant_name, applicant_phone, applicant_email, cover_note, portfolio_link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    String(applicantName).trim(),
    String(applicantPhone).trim(),
    applicantEmail ? String(applicantEmail).trim() : null,
    coverNote ? String(coverNote).trim() : null,
    portfolioLink ? String(portfolioLink).trim() : null
  );

  res.status(201).json({ success: true });
});

// View applications for a job (poster must supply their manage code)
app.get("/api/jobs/:id/applications", (req, res) => {
  const { manageCode } = req.query;
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (isBlank(manageCode) || String(manageCode).toUpperCase() !== job.manage_code) {
    return res.status(403).json({ error: "That management code does not match this post." });
  }

  const applications = db
    .prepare("SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC")
    .all(req.params.id);

  res.json({
    job: publicJob(job, applications.length),
    applications: applications.map((a) => ({
      id: a.id,
      applicantName: a.applicant_name,
      applicantPhone: a.applicant_phone,
      applicantEmail: a.applicant_email,
      coverNote: a.cover_note,
      portfolioLink: a.portfolio_link,
      createdAt: a.created_at
    }))
  });
});

// Basic stats for the homepage header (nice touch, cheap to compute)
app.get("/api/stats", (req, res) => {
  const jobs = db.prepare("SELECT COUNT(*) AS c FROM jobs").get().c;
  const applications = db.prepare("SELECT COUNT(*) AS c FROM applications").get().c;
  res.json({ jobs, applications });
});

app.listen(PORT, () => {
  console.log(`Artisan/Graduate Job Board running on http://localhost:${PORT}`);
});
