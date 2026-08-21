// server.js
// The whole backend for the Artisan/Graduate Job Board.
// One Express app: serves the static frontend AND the JSON API.
// Data is stored in a local JSON file (see db.js) — no native database
// dependencies, so it installs cleanly on any hosting platform.

const path = require("path");
const express = require("express");
const store = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

// ---------- routes ----------

// List / search / filter jobs
app.get("/api/jobs", (req, res) => {
  const { search, category, state, jobType } = req.query;
  const jobs = store.listJobs({ search, category, state, jobType });
  res.json({ jobs });
});

// Get one job
app.get("/api/jobs/:id", (req, res) => {
  const job = store.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json({ job });
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

  const result = store.createJob({
    title: String(title).trim(),
    posterName: String(posterName).trim(),
    category: String(category).trim(),
    jobType: String(jobType).trim(),
    state: String(state).trim(),
    lga: lga ? String(lga).trim() : null,
    payAmount: payAmount ? String(payAmount).trim() : null,
    description: String(description).trim(),
    contactPhone: String(contactPhone).trim(),
    contactWhatsapp: contactWhatsapp ? String(contactWhatsapp).trim() : null,
    contactEmail: contactEmail ? String(contactEmail).trim() : null
  });

  res.status(201).json(result);
});

// Delete a job posting (poster must supply their manage code)
app.delete("/api/jobs/:id", (req, res) => {
  const { manageCode } = req.body || {};
  const result = store.deleteJob(req.params.id, manageCode);
  if (result.error === "not_found") return res.status(404).json({ error: "Job not found." });
  if (result.error === "forbidden") {
    return res.status(403).json({ error: "That management code does not match this post." });
  }
  res.json({ success: true });
});

// Apply to a job
app.post("/api/jobs/:id/apply", (req, res) => {
  const { applicantName, applicantPhone, applicantEmail, coverNote, portfolioLink } = req.body || {};
  if (isBlank(applicantName) || isBlank(applicantPhone)) {
    return res.status(400).json({ error: "Name and phone number are required to apply." });
  }
  if (coverNote && String(coverNote).length > 1500) {
    return res.status(400).json({ error: "Cover note is too long (max 1500 characters)." });
  }

  const result = store.addApplication(req.params.id, {
    applicantName: String(applicantName).trim(),
    applicantPhone: String(applicantPhone).trim(),
    applicantEmail: applicantEmail ? String(applicantEmail).trim() : null,
    coverNote: coverNote ? String(coverNote).trim() : null,
    portfolioLink: portfolioLink ? String(portfolioLink).trim() : null
  });

  if (result.error === "not_found") return res.status(404).json({ error: "Job not found." });
  res.status(201).json({ success: true });
});

// View applications for a job (poster must supply their manage code)
app.get("/api/jobs/:id/applications", (req, res) => {
  const { manageCode } = req.query;
  const result = store.getApplications(req.params.id, manageCode);
  if (result.error === "not_found") return res.status(404).json({ error: "Job not found." });
  if (result.error === "forbidden") {
    return res.status(403).json({ error: "That management code does not match this post." });
  }
  res.json(result);
});

// Basic stats for the homepage header
app.get("/api/stats", (req, res) => {
  res.json(store.getStats());
});

// One-time (or on-demand) demo data seed. Visit /api/seed to fill an
// empty board. Visit /api/seed?force=true to wipe existing jobs and
// applications and replace them with fresh sample data, useful before
// recording a demo. Not linked from the UI on purpose.
app.get("/api/seed", (req, res) => {
  const force = req.query.force === "true";
  const result = store.seedIfEmpty(force);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Artisan/Graduate Job Board running on http://localhost:${PORT}`);
});
