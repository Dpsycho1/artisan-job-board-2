// app.js
// All frontend behaviour for Ojiro Board. Plain JavaScript, no build step,
// no framework — talks to the Express API in server.js over fetch().

const CATEGORIES = [
  "Electrician", "Plumber", "Carpenter / Furniture", "Tailor / Fashion Designer",
  "Mechanic / Auto Technician", "Welder / Fabricator", "Mason / Bricklayer",
  "Painter / POP", "Hairdresser / Barber", "Caterer / Chef",
  "Phone & Laptop Repair", "Generator / AC Technician", "Photographer",
  "Cleaner / Domestic Staff", "Driver", "IT / Software", "Sales & Marketing",
  "Administration / Office", "Accounting / Finance", "Teaching / Tutoring",
  "Customer Service", "Content / Social Media", "Logistics", "Other"
];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "One-off / Gig", "Apprenticeship / Internship"];

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara"
];

let currentJobs = [];
let searchDebounce = null;

// ---------- init ----------

document.addEventListener("DOMContentLoaded", () => {
  populateSelect("categoryFilter", CATEGORIES, "All categories", true);
  populateSelect("stateFilter", STATES, "All states", true);
  populateSelect("typeFilter", JOB_TYPES, "All job types", true);
  populateSelect(document.querySelector('select[name="category"]'), CATEGORIES, "Select a category");
  populateSelect(document.querySelector('select[name="jobType"]'), JOB_TYPES, "Select a type");
  populateSelect(document.querySelector('select[name="state"]'), STATES, "Select a state");

  loadJobs();
  loadStats();

  document.getElementById("searchInput").addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadJobs, 300);
  });
  document.getElementById("categoryFilter").addEventListener("change", loadJobs);
  document.getElementById("stateFilter").addEventListener("change", loadJobs);
  document.getElementById("typeFilter").addEventListener("change", loadJobs);

  document.getElementById("postJobOpenBtn").addEventListener("click", () => openModal("postJobModal"));
  document.getElementById("postJobCloseBtn").addEventListener("click", () => closeModal("postJobModal"));
  document.getElementById("postJobForm").addEventListener("submit", handlePostJob);

  document.getElementById("codeCloseBtn").addEventListener("click", () => {
    closeModal("codeModal");
    loadJobs();
    loadStats();
  });
  document.getElementById("copyCodeBtn").addEventListener("click", copyManageCode);

  document.getElementById("jobDetailCloseBtn").addEventListener("click", () => closeModal("jobDetailModal"));
  document.getElementById("manageCloseBtn").addEventListener("click", () => closeModal("manageModal"));

  // Close modal when clicking the backdrop itself
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.remove("open");
    });
  });
});

function populateSelect(target, options, placeholder, isFilter = false) {
  const select = typeof target === "string" ? document.getElementById(target) : target;
  if (!select) return;
  select.innerHTML = "";
  const placeholderOpt = document.createElement("option");
  placeholderOpt.value = isFilter ? "all" : "";
  placeholderOpt.textContent = placeholder;
  if (!isFilter) placeholderOpt.disabled = true;
  placeholderOpt.selected = true;
  select.appendChild(placeholderOpt);
  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    select.appendChild(el);
  });
}

// ---------- data loading ----------

async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();
    document.getElementById("statJobs").textContent = data.jobs;
    document.getElementById("statApps").textContent = data.applications;
  } catch (err) {
    // Stats are decorative; fail silently rather than blocking the page.
  }
}

async function loadJobs() {
  const search = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("categoryFilter").value;
  const state = document.getElementById("stateFilter").value;
  const jobType = document.getElementById("typeFilter").value;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "all") params.set("category", category);
  if (state && state !== "all") params.set("state", state);
  if (jobType && jobType !== "all") params.set("jobType", jobType);

  const resultsCount = document.getElementById("resultsCount");
  resultsCount.textContent = "Loading notices…";

  try {
    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    currentJobs = data.jobs || [];
    renderJobs(currentJobs);
    resultsCount.textContent = currentJobs.length === 1
      ? "1 notice on the board"
      : `${currentJobs.length} notices on the board`;
  } catch (err) {
    resultsCount.textContent = "Could not load notices. Check your connection and refresh.";
    console.error(err);
  }
}

// ---------- rendering ----------

function renderJobs(jobs) {
  const list = document.getElementById("jobList");
  list.innerHTML = "";

  if (jobs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<p><strong>No notices match that search.</strong></p><p>Try a different keyword, or be the first to post one.</p>`;
    list.appendChild(empty);
    return;
  }

  const template = document.getElementById("jobCardTemplate");

  jobs.forEach((job) => {
    const card = template.content.cloneNode(true);
    card.querySelector(".badge-category").textContent = job.category;
    card.querySelector(".badge-type").textContent = job.jobType;
    card.querySelector(".job-title").textContent = job.title;
    card.querySelector(".job-poster").textContent = `Posted by ${job.posterName}`;
    card.querySelector(".job-location").textContent = job.lga ? `${job.lga}, ${job.state}` : job.state;
    const payEl = card.querySelector(".job-pay");
    if (job.payAmount) {
      payEl.textContent = job.payAmount;
    } else {
      payEl.remove();
    }
    card.querySelector(".job-desc").textContent = job.description;
    card.querySelector(".job-apps").textContent =
      job.applicationCount === 1 ? "1 application so far" : `${job.applicationCount} applications so far`;
    card.querySelector(".btn-view").addEventListener("click", () => openJobDetail(job.id));
    list.appendChild(card);
  });
}

// ---------- post a job ----------

async function handlePostJob(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("postJobError");
  errorEl.textContent = "";

  const payload = {
    title: form.title.value,
    posterName: form.posterName.value,
    category: form.category.value,
    jobType: form.jobType.value,
    state: form.state.value,
    lga: form.lga.value,
    payAmount: form.payAmount.value,
    description: form.description.value,
    contactPhone: form.contactPhone.value,
    contactWhatsapp: form.contactWhatsapp.value,
    contactEmail: form.contactEmail.value
  };

  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Something went wrong. Please check the form and try again.";
      return;
    }
    form.reset();
    closeModal("postJobModal");
    document.getElementById("manageCodeDisplay").textContent = data.manageCode;
    openModal("codeModal");
  } catch (err) {
    errorEl.textContent = "Could not reach the server. Check your connection and try again.";
    console.error(err);
  }
}

function copyManageCode() {
  const code = document.getElementById("manageCodeDisplay").textContent;
  navigator.clipboard.writeText(code).then(() => showToast("Code copied."));
}

// ---------- job detail + apply ----------

async function openJobDetail(jobId) {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) return showToast("Could not load that notice.");
  const { job } = await res.json();

  const content = document.getElementById("jobDetailContent");
  content.innerHTML = `
    <div class="detail-badges">
      <span class="badge badge-category">${escapeHtml(job.category)}</span>
      <span class="badge badge-type">${escapeHtml(job.jobType)}</span>
    </div>
    <h2>${escapeHtml(job.title)}</h2>
    <p class="job-poster">Posted by ${escapeHtml(job.posterName)} &middot; ${escapeHtml(job.lga ? job.lga + ", " + job.state : job.state)}</p>
    ${job.payAmount ? `<p class="job-pay">${escapeHtml(job.payAmount)}</p>` : ""}

    <div class="detail-section">
      <h4>About this job</h4>
      <p class="detail-desc">${escapeHtml(job.description)}</p>
    </div>

    <div class="detail-section">
      <h4>Reach the poster directly</h4>
      <div class="contact-actions">
        <a class="btn btn-secondary" href="tel:${escapeAttr(job.contactPhone)}">Call ${escapeHtml(job.contactPhone)}</a>
        ${job.contactWhatsapp ? `<a class="btn btn-secondary" target="_blank" rel="noopener" href="https://wa.me/${escapeAttr(toWhatsappDigits(job.contactWhatsapp))}">WhatsApp</a>` : ""}
        ${job.contactEmail ? `<a class="btn btn-secondary" href="mailto:${escapeAttr(job.contactEmail)}">Email</a>` : ""}
      </div>
    </div>

    <form class="apply-form" id="applyForm">
      <h4 style="font-family:'IBM Plex Mono',monospace; text-transform:uppercase; font-size:11px; letter-spacing:.08em; color:var(--ink-soft); margin-bottom:10px;">Or apply through the board</h4>
      <label>Your name *
        <input type="text" name="applicantName" required maxlength="120" />
      </label>
      <div class="field-row">
        <label>Phone *
          <input type="tel" name="applicantPhone" required maxlength="30" />
        </label>
        <label>Email
          <input type="email" name="applicantEmail" maxlength="120" />
        </label>
      </div>
      <label>Short cover note
        <textarea name="coverNote" rows="3" maxlength="1500" placeholder="Why you're a good fit, relevant experience…"></textarea>
      </label>
      <label>Link to portfolio / past work (optional)
        <input type="url" name="portfolioLink" placeholder="https://…" />
      </label>
      <p class="form-error" id="applyError" role="alert"></p>
      <button type="submit" class="btn btn-primary btn-full">Send application</button>
    </form>

    <div class="danger-zone">
      <button class="btn btn-small" id="manageThisJobBtn" type="button">I posted this — manage it</button>
    </div>
  `;

  content.querySelector("#applyForm").addEventListener("submit", (e) => handleApply(e, jobId));
  content.querySelector("#manageThisJobBtn").addEventListener("click", () => {
    closeModal("jobDetailModal");
    openManageModal(jobId);
  });

  openModal("jobDetailModal");
}

async function handleApply(e, jobId) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("applyError");
  errorEl.textContent = "";

  const payload = {
    applicantName: form.applicantName.value,
    applicantPhone: form.applicantPhone.value,
    applicantEmail: form.applicantEmail.value,
    coverNote: form.coverNote.value,
    portfolioLink: form.portfolioLink.value
  };

  try {
    const res = await fetch(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || "Could not send your application. Please check the form.";
      return;
    }
    closeModal("jobDetailModal");
    showToast("Application sent. The poster can now see it.");
    loadJobs();
    loadStats();
  } catch (err) {
    errorEl.textContent = "Could not reach the server. Check your connection and try again.";
  }
}

// ---------- manage job (owner view) ----------

let manageJobId = null;

function openManageModal(jobId) {
  manageJobId = jobId;
  document.getElementById("manageError").textContent = "";
  document.getElementById("manageResults").innerHTML = "";
  document.getElementById("manageCodeInput").value = "";
  openModal("manageModal");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("manageCodeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("manageCodeInput").value.trim();
    const errorEl = document.getElementById("manageError");
    const resultsEl = document.getElementById("manageResults");
    errorEl.textContent = "";
    resultsEl.innerHTML = "";

    try {
      const res = await fetch(`/api/jobs/${manageJobId}/applications?manageCode=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "That code did not work.";
        return;
      }

      if (data.applications.length === 0) {
        resultsEl.innerHTML = `<p>No applications yet. Check back soon.</p>`;
      } else {
        resultsEl.innerHTML = data.applications.map((a) => `
          <div class="applicant-card">
            <p class="applicant-name">${escapeHtml(a.applicantName)}</p>
            <p>${escapeHtml(a.applicantPhone)}${a.applicantEmail ? " &middot; " + escapeHtml(a.applicantEmail) : ""}</p>
            ${a.coverNote ? `<p>${escapeHtml(a.coverNote)}</p>` : ""}
            ${a.portfolioLink ? `<p><a href="${escapeAttr(a.portfolioLink)}" target="_blank" rel="noopener">View portfolio / work sample</a></p>` : ""}
          </div>
        `).join("");
      }

      resultsEl.innerHTML += `
        <div class="danger-zone">
          <button class="btn btn-small" id="deleteJobBtn" type="button">Take this notice down</button>
        </div>
      `;
      document.getElementById("deleteJobBtn").addEventListener("click", () => deleteJob(code));
    } catch (err) {
      errorEl.textContent = "Could not reach the server. Check your connection and try again.";
    }
  });
});

async function deleteJob(code) {
  if (!confirm("Take this notice down? This cannot be undone.")) return;
  try {
    const res = await fetch(`/api/jobs/${manageJobId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manageCode: code })
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById("manageError").textContent = data.error || "Could not remove this notice.";
      return;
    }
    closeModal("manageModal");
    showToast("Notice taken down.");
    loadJobs();
    loadStats();
  } catch (err) {
    document.getElementById("manageError").textContent = "Could not reach the server.";
  }
}

// ---------- small helpers ----------

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}
function toWhatsappDigits(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "234" + digits.slice(1);
  return digits;
}
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}
