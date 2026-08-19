// db.js
// Sets up the SQLite database and creates the tables the app needs
// if they do not already exist. SQLite stores everything in one file
// (data.db) so there is nothing extra to install or configure.

const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "data.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    poster_name TEXT NOT NULL,
    category TEXT NOT NULL,
    job_type TEXT NOT NULL,
    state TEXT NOT NULL,
    lga TEXT,
    pay_amount TEXT,
    description TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_whatsapp TEXT,
    contact_email TEXT,
    manage_code TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    applicant_email TEXT,
    cover_note TEXT,
    portfolio_link TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (category);
  CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs (state);
  CREATE INDEX IF NOT EXISTS idx_applications_job ON applications (job_id);
`);

module.exports = db;
