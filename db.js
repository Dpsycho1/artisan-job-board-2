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

// ---------- one-time demo data ----------
// Fills the board with realistic sample listings so a fresh deployment
// isn't empty for a demo or first visit. Only runs if there are zero
// jobs already, so it's safe to trigger more than once by accident.

const SAMPLE_JOBS = [
  { title: "Generator technician needed for weekend service", posterName: "Nett Electricals", category: "Generator / AC Technician", jobType: "One-off / Gig", state: "Kaduna", lga: "Barnawa", payAmount: "₦15,000", description: "Need someone experienced to service a 10KVA generator this Saturday. Must bring own tools.", contactPhone: "08031234567", contactWhatsapp: "08031234567" },
  { title: "Electrician for shop rewiring", posterName: "Galaxy Mall Traders Association", category: "Electrician", jobType: "Contract", state: "Kaduna", lga: "Kaduna North", payAmount: "₦45,000", description: "Full rewiring job for a small retail shop. Materials provided, labour only.", contactPhone: "08055512340" },
  { title: "Tailor needed for Aso-ebi order", posterName: "Amina's Fashion House", category: "Tailor / Fashion Designer", jobType: "One-off / Gig", state: "Kaduna", lga: "Kawo", payAmount: "₦8,000 per piece", description: "20 pieces of Aso-ebi to be sewn for a wedding in three weeks. Send samples of past work.", contactPhone: "08033445566", contactWhatsapp: "08033445566" },
  { title: "Mechanic for fleet maintenance", posterName: "Zenith Logistics", category: "Mechanic / Auto Technician", jobType: "Part-time", state: "Lagos", lga: "Ikeja", payAmount: "₦70,000/month", description: "Weekly maintenance checks on a small delivery fleet of 6 vehicles.", contactPhone: "08099001122" },
  { title: "Frontend developer for school result portal", posterName: "Compas Platform", category: "IT / Software", jobType: "Contract", state: "Lagos", lga: "Yaba", payAmount: "₦150,000", description: "Build a school result-management portal using React. Wireframes already provided.", contactPhone: "08099998888", contactEmail: "hiring@compasplatform.example" },
  { title: "Welder for gate and burglary-proof fabrication", posterName: "Danladi Metal Works", category: "Welder / Fabricator", jobType: "One-off / Gig", state: "Kaduna", lga: "Sabon Gari", payAmount: "Negotiable", description: "Fabrication of a compound gate and window burglary-proofs. Site visit required first.", contactPhone: "08066778899" },
  { title: "Barber wanted, chair rental available", posterName: "Sharp Cuts Salon", category: "Hairdresser / Barber", jobType: "Full-time", state: "Kaduna", lga: "Barnawa", payAmount: "Commission-based", description: "Chair space available in an established barbershop near Galaxy Mall. Bring your own clippers.", contactPhone: "08012345678", contactWhatsapp: "08012345678" },
  { title: "Sales associate for pharmacy branch", posterName: "Nett Pharmacy and Stores Ltd", category: "Sales & Marketing", jobType: "Full-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦60,000/month", description: "Front-desk sales role in a busy pharmacy. Retail or customer service experience preferred.", contactPhone: "08087654321" },
  { title: "Phone and laptop repair technician", posterName: "QuickFix Gadgets", category: "Phone & Laptop Repair", jobType: "Full-time", state: "FCT (Abuja)", lga: "Wuse", payAmount: "₦80,000/month", description: "Experienced technician needed for screen replacement, board repair and software troubleshooting.", contactPhone: "08023456789" },
  { title: "Mason for boundary wall construction", posterName: "Private client", category: "Mason / Bricklayer", jobType: "Contract", state: "Kaduna", lga: "Ungwan Rimi", payAmount: "₦120,000", description: "Boundary wall construction, roughly 60 metres. Materials will be supplied by client.", contactPhone: "08078901234" },
  { title: "Content and social media assistant", posterName: "Remedi Konsult", category: "Content / Social Media", jobType: "Part-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦40,000/month", description: "Manage Instagram and Facebook posting schedule for a pharmacy consulting brand. Some design skill a plus.", contactPhone: "08034567890", contactEmail: "hello@remedikonsult.example" },
  { title: "Caterer needed for weekly office lunch", posterName: "Highland Business Park", category: "Caterer / Chef", jobType: "Part-time", state: "Kaduna", lga: "Independence Way", payAmount: "₦25,000/week", description: "Deliver lunch for an office of 15 staff, Monday to Friday. Menu rotation expected.", contactPhone: "08045678901" },
  { title: "NYSC corps member for admin support", posterName: "Almara Hub", category: "Administration / Office", jobType: "Full-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦45,000/month", description: "Front desk and records support at a tech hub. Must be a serving corps member.", contactPhone: "08056789012" },
  { title: "Driver with valid license, Kaduna routes", posterName: "Private client", category: "Driver", jobType: "Full-time", state: "Kaduna", lga: "Kawo", payAmount: "₦50,000/month", description: "Family driver needed, must know Kaduna metro routes well and have a clean license.", contactPhone: "08067890123" },
  { title: "Painter for 3-bedroom apartment", posterName: "Private client", category: "Painter / POP", jobType: "One-off / Gig", state: "Lagos", lga: "Lekki", payAmount: "₦90,000", description: "Interior painting for a newly built 3-bedroom flat. Paint to be supplied by client.", contactPhone: "08078123456" }
];

function seedIfEmpty() {
  const data = loadData();
  if (data.jobs.length > 0) {
    return { seeded: false, reason: "Board already has jobs on it, nothing added." };
  }
  SAMPLE_JOBS.forEach((sample) => {
    const manageCode = generateManageCode();
    const job = {
      id: data.nextJobId,
      title: sample.title,
      posterName: sample.posterName,
      category: sample.category,
      jobType: sample.jobType,
      state: sample.state,
      lga: sample.lga || null,
      payAmount: sample.payAmount || null,
      description: sample.description,
      contactPhone: sample.contactPhone,
      contactWhatsapp: sample.contactWhatsapp || null,
      contactEmail: sample.contactEmail || null,
      manageCode,
      createdAt: new Date().toISOString()
    };
    data.jobs.push(job);
    data.nextJobId += 1;
  });
  saveData(data);
  return { seeded: true, count: SAMPLE_JOBS.length };
}

module.exports = {
  listJobs,
  getJob,
  createJob,
  deleteJob,
  addApplication,
  getApplications,
  getStats,
  seedIfEmpty
};
