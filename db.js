// db.js
// A small, dependency-free data store backed by a single JSON file
// (data.json). No native compilation required, unlike better-sqlite3,
// which makes this reliable to install on any free hosting platform.
// It exposes plain functions instead of SQL, which server.js calls directly.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { jobs: [], applications: [], nextJobId: 1, nextApplicationId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    // If the file is ever corrupted, start fresh rather than crash the app.
    return { jobs: [], applications: [], nextJobId: 1, nextApplicationId: 1 };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateManageCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "3F9A2C1B"
}

function applicationCountFor(data, jobId) {
  return data.applications.filter((a) => a.jobId === jobId).length;
}

function publicJob(job, applicationCount) {
  return {
    id: job.id,
    title: job.title,
    posterName: job.posterName,
    category: job.category,
    jobType: job.jobType,
    state: job.state,
    lga: job.lga,
    payAmount: job.payAmount,
    description: job.description,
    contactPhone: job.contactPhone,
    contactWhatsapp: job.contactWhatsapp,
    contactEmail: job.contactEmail,
    createdAt: job.createdAt,
    applicationCount: applicationCount || 0
  };
}

// ---------- public API used by server.js ----------

function listJobs({ search, category, state, jobType } = {}) {
  const data = loadData();
  let jobs = [...data.jobs];

  if (search && search.trim() !== "") {
    const needle = search.trim().toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(needle) ||
        j.description.toLowerCase().includes(needle) ||
        j.posterName.toLowerCase().includes(needle)
    );
  }
  if (category && category !== "all") jobs = jobs.filter((j) => j.category === category);
  if (state && state !== "all") jobs = jobs.filter((j) => j.state === state);
  if (jobType && jobType !== "all") jobs = jobs.filter((j) => j.jobType === jobType);

  jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return jobs.map((j) => publicJob(j, applicationCountFor(data, j.id)));
}

function getJob(id) {
  const data = loadData();
  const job = data.jobs.find((j) => j.id === Number(id));
  if (!job) return null;
  return publicJob(job, applicationCountFor(data, job.id));
}

function createJob(input) {
  const data = loadData();
  const manageCode = generateManageCode();
  const job = {
    id: data.nextJobId,
    title: input.title,
    posterName: input.posterName,
    category: input.category,
    jobType: input.jobType,
    state: input.state,
    lga: input.lga || null,
    payAmount: input.payAmount || null,
    description: input.description,
    contactPhone: input.contactPhone,
    contactWhatsapp: input.contactWhatsapp || null,
    contactEmail: input.contactEmail || null,
    manageCode,
    createdAt: new Date().toISOString()
  };
  data.jobs.push(job);
  data.nextJobId += 1;
  saveData(data);
  return { job: publicJob(job, 0), manageCode };
}

function deleteJob(id, manageCode) {
  const data = loadData();
  const job = data.jobs.find((j) => j.id === Number(id));
  if (!job) return { error: "not_found" };
  if (!manageCode || manageCode.toUpperCase() !== job.manageCode) return { error: "forbidden" };

  data.jobs = data.jobs.filter((j) => j.id !== Number(id));
  data.applications = data.applications.filter((a) => a.jobId !== Number(id));
  saveData(data);
  return { success: true };
}

function addApplication(jobId, input) {
  const data = loadData();
  const job = data.jobs.find((j) => j.id === Number(jobId));
  if (!job) return { error: "not_found" };

  const application = {
    id: data.nextApplicationId,
    jobId: Number(jobId),
    applicantName: input.applicantName,
    applicantPhone: input.applicantPhone,
    applicantEmail: input.applicantEmail || null,
    coverNote: input.coverNote || null,
    portfolioLink: input.portfolioLink || null,
    createdAt: new Date().toISOString()
  };
  data.applications.push(application);
  data.nextApplicationId += 1;
  saveData(data);
  return { success: true };
}

function getApplications(jobId, manageCode) {
  const data = loadData();
  const job = data.jobs.find((j) => j.id === Number(jobId));
  if (!job) return { error: "not_found" };
  if (!manageCode || String(manageCode).toUpperCase() !== job.manageCode) return { error: "forbidden" };

  const applications = data.applications
    .filter((a) => a.jobId === Number(jobId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { job: publicJob(job, applications.length), applications };
}

function getStats() {
  const data = loadData();
  return { jobs: data.jobs.length, applications: data.applications.length };
}

module.exports = {
  listJobs,
  getJob,
  createJob,
  deleteJob,
  addApplication,
  getApplications,
  getStats
};
