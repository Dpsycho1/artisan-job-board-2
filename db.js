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
  // Electrician
  { title: "Electrician for shop rewiring", posterName: "Galaxy Mall Traders Association", category: "Electrician", jobType: "Contract", state: "Kaduna", lga: "Kaduna North", payAmount: "₦45,000", description: "Full rewiring job for a small retail shop. Materials provided, labour only.", contactPhone: "08055512340" },
  { title: "Residential wiring for new 4-bedroom duplex", posterName: "Private client", category: "Electrician", jobType: "Contract", state: "Rivers", lga: "Port Harcourt", payAmount: "₦180,000", description: "Complete wiring for a newly built duplex. Certified electrician preferred, must provide past work references.", contactPhone: "08123456701" },

  // Plumber
  { title: "Plumber needed for bathroom fittings", posterName: "Private client", category: "Plumber", jobType: "One-off / Gig", state: "Oyo", lga: "Ibadan North", payAmount: "₦30,000", description: "Install new sink, shower and toilet fittings in a renovated bathroom.", contactPhone: "08123456702" },
  { title: "Plumbing maintenance contract, small estate", posterName: "Greenfield Estate Management", category: "Plumber", jobType: "Part-time", state: "Ogun", lga: "Sagamu", payAmount: "₦35,000/month", description: "Monthly plumbing checks and repairs across a 12-unit residential estate.", contactPhone: "08123456703" },

  // Carpenter / Furniture
  { title: "Carpenter for office furniture set", posterName: "Highland Business Park", category: "Carpenter / Furniture", jobType: "One-off / Gig", state: "Kaduna", lga: "Independence Way", payAmount: "₦95,000", description: "Build 3 office desks and a reception counter to specification, drawings provided.", contactPhone: "08123456704" },
  { title: "Furniture maker for wardrobe fitting", posterName: "Private client", category: "Carpenter / Furniture", jobType: "Contract", state: "Delta", lga: "Warri", payAmount: "₦70,000", description: "Built-in wardrobe for two bedrooms, must supply own wood and finishing.", contactPhone: "08123456705" },

  // Tailor / Fashion Designer
  { title: "Tailor needed for Aso-ebi order", posterName: "Amina's Fashion House", category: "Tailor / Fashion Designer", jobType: "One-off / Gig", state: "Kaduna", lga: "Kawo", payAmount: "₦8,000 per piece", description: "20 pieces of Aso-ebi to be sewn for a wedding in three weeks. Send samples of past work.", contactPhone: "08033445566", contactWhatsapp: "08033445566" },
  { title: "Fashion designer for boutique launch", posterName: "Zaria Styles", category: "Tailor / Fashion Designer", jobType: "Full-time", state: "Kano", lga: "Fagge", payAmount: "₦55,000/month", description: "In-house designer for a new boutique, must be comfortable with both native and corporate wear.", contactPhone: "08123456706" },

  // Mechanic / Auto Technician
  { title: "Mechanic for fleet maintenance", posterName: "Zenith Logistics", category: "Mechanic / Auto Technician", jobType: "Part-time", state: "Lagos", lga: "Ikeja", payAmount: "₦70,000/month", description: "Weekly maintenance checks on a small delivery fleet of 6 vehicles.", contactPhone: "08099001122" },
  { title: "Auto technician, engine diagnostics", posterName: "Cross Roads Motors", category: "Mechanic / Auto Technician", jobType: "Full-time", state: "Edo", lga: "Benin City", payAmount: "₦65,000/month", description: "Experienced technician for a busy workshop, diagnostic tool experience an advantage.", contactPhone: "08123456707" },

  // Welder / Fabricator
  { title: "Welder for gate and burglary-proof fabrication", posterName: "Danladi Metal Works", category: "Welder / Fabricator", jobType: "One-off / Gig", state: "Kaduna", lga: "Sabon Gari", payAmount: "Negotiable", description: "Fabrication of a compound gate and window burglary-proofs. Site visit required first.", contactPhone: "08066778899" },
  { title: "Fabricator for market stall frames", posterName: "Onitsha Main Market Union", category: "Welder / Fabricator", jobType: "Contract", state: "Anambra", lga: "Onitsha", payAmount: "₦150,000", description: "Metal frames for 10 market stalls, standard design supplied.", contactPhone: "08123456708" },

  // Mason / Bricklayer
  { title: "Mason for boundary wall construction", posterName: "Private client", category: "Mason / Bricklayer", jobType: "Contract", state: "Kaduna", lga: "Ungwan Rimi", payAmount: "₦120,000", description: "Boundary wall construction, roughly 60 metres. Materials will be supplied by client.", contactPhone: "08078901234" },
  { title: "Bricklayer for foundation work", posterName: "Private client", category: "Mason / Bricklayer", jobType: "One-off / Gig", state: "Plateau", lga: "Jos North", payAmount: "₦85,000", description: "Foundation laying for a 2-bedroom bungalow, must bring own team of 2 assistants.", contactPhone: "08123456709" },

  // Painter / POP
  { title: "Painter for 3-bedroom apartment", posterName: "Private client", category: "Painter / POP", jobType: "One-off / Gig", state: "Lagos", lga: "Lekki", payAmount: "₦90,000", description: "Interior painting for a newly built 3-bedroom flat. Paint to be supplied by client.", contactPhone: "08078123456" },
  { title: "POP ceiling installer for shop renovation", posterName: "Private client", category: "Painter / POP", jobType: "Contract", state: "Enugu", lga: "Enugu North", payAmount: "₦60,000", description: "POP ceiling design and installation for a shop renovation, sample designs a plus.", contactPhone: "08123456710" },

  // Hairdresser / Barber
  { title: "Barber wanted, chair rental available", posterName: "Sharp Cuts Salon", category: "Hairdresser / Barber", jobType: "Full-time", state: "Kaduna", lga: "Barnawa", payAmount: "Commission-based", description: "Chair space available in an established barbershop near Galaxy Mall. Bring your own clippers.", contactPhone: "08012345678", contactWhatsapp: "08012345678" },
  { title: "Hairdresser for salon expansion", posterName: "Crown Hair Studio", category: "Hairdresser / Barber", jobType: "Full-time", state: "Abia", lga: "Aba North", payAmount: "₦45,000/month", description: "Braiding and weaving specialist needed for a growing salon in Aba.", contactPhone: "08123456711" },

  // Caterer / Chef
  { title: "Caterer needed for weekly office lunch", posterName: "Highland Business Park", category: "Caterer / Chef", jobType: "Part-time", state: "Kaduna", lga: "Independence Way", payAmount: "₦25,000/week", description: "Deliver lunch for an office of 15 staff, Monday to Friday. Menu rotation expected.", contactPhone: "08045678901" },
  { title: "Chef for small event catering business", posterName: "Delight Events", category: "Caterer / Chef", jobType: "Contract", state: "Ekiti", lga: "Ado-Ekiti", payAmount: "₦30,000/event", description: "Cook for weekend event bookings, jollof and small chops experience required.", contactPhone: "08123456712" },

  // Phone & Laptop Repair
  { title: "Phone and laptop repair technician", posterName: "QuickFix Gadgets", category: "Phone & Laptop Repair", jobType: "Full-time", state: "FCT (Abuja)", lga: "Wuse", payAmount: "₦80,000/month", description: "Experienced technician needed for screen replacement, board repair and software troubleshooting.", contactPhone: "08023456789" },
  { title: "GSM technician for repair kiosk", posterName: "Computer Village Traders", category: "Phone & Laptop Repair", jobType: "Full-time", state: "Lagos", lga: "Ikeja", payAmount: "₦70,000/month", description: "Manage a repair kiosk, must know common Android and iPhone board-level faults.", contactPhone: "08123456713" },

  // Generator / AC Technician
  { title: "Generator technician needed for weekend service", posterName: "Nett Electricals", category: "Generator / AC Technician", jobType: "One-off / Gig", state: "Kaduna", lga: "Barnawa", payAmount: "₦15,000", description: "Need someone experienced to service a 10KVA generator this Saturday. Must bring own tools.", contactPhone: "08031234567", contactWhatsapp: "08031234567" },
  { title: "AC installation and servicing technician", posterName: "CoolBreeze Systems", category: "Generator / AC Technician", jobType: "Contract", state: "Cross River", lga: "Calabar Municipal", payAmount: "₦8,000/unit", description: "Install and service split units for a hotel with 15 rooms.", contactPhone: "08123456714" },

  // Photographer
  { title: "Photographer for wedding coverage", posterName: "Private client", category: "Photographer", jobType: "One-off / Gig", state: "Osun", lga: "Osogbo", payAmount: "₦120,000", description: "Full-day wedding coverage, must bring own equipment and provide edited photos within a week.", contactPhone: "08123456715" },
  { title: "Product photographer for online store", posterName: "Bella Fashion Store", category: "Photographer", jobType: "Part-time", state: "Lagos", lga: "Surulere", payAmount: "₦5,000/session", description: "Weekly product shoots for an online clothing store, studio lighting a plus.", contactPhone: "08123456716" },

  // Cleaner / Domestic Staff
  { title: "Cleaner for office space, twice weekly", posterName: "Highland Business Park", category: "Cleaner / Domestic Staff", jobType: "Part-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦20,000/month", description: "Office cleaning twice a week, evenings preferred.", contactPhone: "08123456717" },
  { title: "Domestic staff for family home", posterName: "Private client", category: "Cleaner / Domestic Staff", jobType: "Full-time", state: "Niger", lga: "Minna", payAmount: "₦30,000/month", description: "Live-out domestic help, cooking and general house cleaning.", contactPhone: "08123456718" },

  // Driver
  { title: "Driver with valid license, Kaduna routes", posterName: "Private client", category: "Driver", jobType: "Full-time", state: "Kaduna", lga: "Kawo", payAmount: "₦50,000/month", description: "Family driver needed, must know Kaduna metro routes well and have a clean license.", contactPhone: "08067890123" },
  { title: "Dispatch rider for logistics company", posterName: "Speedway Logistics", category: "Driver", jobType: "Full-time", state: "Lagos", lga: "Ojota", payAmount: "₦60,000/month", description: "Own motorcycle preferred, deliveries within Lagos mainland.", contactPhone: "08123456719" },

  // IT / Software
  { title: "Frontend developer for school result portal", posterName: "Compas Platform", category: "IT / Software", jobType: "Contract", state: "Lagos", lga: "Yaba", payAmount: "₦150,000", description: "Build a school result-management portal using React. Wireframes already provided.", contactPhone: "08099998888", contactEmail: "hiring@compasplatform.example" },
  { title: "Junior backend developer, NYSC welcome", posterName: "Almara Hub", category: "IT / Software", jobType: "Apprenticeship / Internship", state: "Kaduna", lga: "Kaduna North", payAmount: "₦40,000/month", description: "Support a small dev team on client projects, Node.js exposure preferred but trainable.", contactPhone: "08123456720" },

  // Sales & Marketing
  { title: "Sales associate for pharmacy branch", posterName: "Nett Pharmacy and Stores Ltd", category: "Sales & Marketing", jobType: "Full-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦60,000/month", description: "Front-desk sales role in a busy pharmacy. Retail or customer service experience preferred.", contactPhone: "08087654321" },
  { title: "Field sales rep for FMCG distributor", posterName: "Coastline Distributors", category: "Sales & Marketing", jobType: "Full-time", state: "Akwa Ibom", lga: "Uyo", payAmount: "₦55,000/month plus commission", description: "Cover retail outlets across Uyo metro for a fast-moving consumer goods distributor.", contactPhone: "08123456721" },

  // Administration / Office
  { title: "NYSC corps member for admin support", posterName: "Almara Hub", category: "Administration / Office", jobType: "Full-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦45,000/month", description: "Front desk and records support at a tech hub. Must be a serving corps member.", contactPhone: "08056789012" },
  { title: "Office administrator, small law firm", posterName: "Balogun & Partners", category: "Administration / Office", jobType: "Full-time", state: "Ondo", lga: "Akure South", payAmount: "₦50,000/month", description: "General office administration, filing and client scheduling for a small law firm.", contactPhone: "08123456722" },

  // Accounting / Finance
  { title: "Bookkeeper for retail chain", posterName: "Nett Pharmacy and Stores Ltd", category: "Accounting / Finance", jobType: "Part-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦35,000/month", description: "Daily sales reconciliation and basic bookkeeping across two branches.", contactPhone: "08123456723" },
  { title: "Accounts assistant, NYSC or fresh graduate", posterName: "Tropical Foods Ltd", category: "Accounting / Finance", jobType: "Full-time", state: "Ogun", lga: "Abeokuta South", payAmount: "₦48,000/month", description: "Support the finance team with invoicing and expense tracking. Accounting background required.", contactPhone: "08123456724" },

  // Teaching / Tutoring
  { title: "Home tutor for JAMB and WAEC prep", posterName: "Private client", category: "Teaching / Tutoring", jobType: "Part-time", state: "Kwara", lga: "Ilorin West", payAmount: "₦3,000/session", description: "Mathematics and English tutoring for two secondary school students, weekends.", contactPhone: "08123456725" },
  { title: "Primary school teacher, Kaduna", posterName: "Bright Future Nursery and Primary School", category: "Teaching / Tutoring", jobType: "Full-time", state: "Kaduna", lga: "Kaduna South", payAmount: "₦40,000/month", description: "Class teacher for primary 3, must have a teaching qualification or relevant experience.", contactPhone: "08123456726" },

  // Customer Service
  { title: "Customer service rep, call centre", posterName: "Coastline Distributors", category: "Customer Service", jobType: "Full-time", state: "Rivers", lga: "Port Harcourt", payAmount: "₦50,000/month", description: "Handle customer calls and complaints for a distribution company, good spoken English required.", contactPhone: "08123456727" },
  { title: "Customer support, e-commerce platform", posterName: "Compas Platform", category: "Customer Service", jobType: "Part-time", state: "Lagos", lga: "Yaba", payAmount: "₦35,000/month", description: "Respond to customer messages and orders on WhatsApp and Instagram for a small online store.", contactPhone: "08123456728" },

  // Content / Social Media
  { title: "Content and social media assistant", posterName: "Remedi Konsult", category: "Content / Social Media", jobType: "Part-time", state: "Kaduna", lga: "Kaduna North", payAmount: "₦40,000/month", description: "Manage Instagram and Facebook posting schedule for a pharmacy consulting brand. Some design skill a plus.", contactPhone: "08034567890", contactEmail: "hello@remedikonsult.example" },
  { title: "Social media manager, fashion brand", posterName: "Zaria Styles", category: "Content / Social Media", jobType: "Part-time", state: "Kano", lga: "Fagge", payAmount: "₦30,000/month", description: "Content calendar, captions and basic Canva design for a growing fashion brand.", contactPhone: "08123456729" },

  // Logistics
  { title: "Dispatch coordinator for delivery startup", posterName: "Speedway Logistics", category: "Logistics", jobType: "Full-time", state: "Lagos", lga: "Ojota", payAmount: "₦65,000/month", description: "Coordinate riders and track deliveries across Lagos mainland routes.", contactPhone: "08123456730" },
  { title: "Warehouse assistant, FMCG distributor", posterName: "Tropical Foods Ltd", category: "Logistics", jobType: "Full-time", state: "Ogun", lga: "Abeokuta South", payAmount: "₦42,000/month", description: "Stock intake, inventory counts and dispatch support at a busy warehouse.", contactPhone: "08123456731" },

  // Other
  { title: "Event usher/hostesses needed for weekend wedding", posterName: "Delight Events", category: "Other", jobType: "One-off / Gig", state: "Bayelsa", lga: "Yenagoa", payAmount: "₦10,000/day", description: "3 ushers needed for a weekend event, must be presentable and punctual.", contactPhone: "08123456732" },
  { title: "Security guard for residential estate", posterName: "Greenfield Estate Management", category: "Other", jobType: "Full-time", state: "Sokoto", lga: "Sokoto North", payAmount: "₦35,000/month", description: "Night shift security for a 12-unit residential estate, prior experience preferred.", contactPhone: "08123456733" }
];

function seedIfEmpty(force) {
  const data = loadData();
  if (data.jobs.length > 0 && !force) {
    return { seeded: false, reason: "Board already has jobs on it. Add ?force=true to the URL to replace them with fresh sample data." };
  }
  data.jobs = [];
  data.applications = [];
  data.nextJobId = 1;
  data.nextApplicationId = 1;
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
