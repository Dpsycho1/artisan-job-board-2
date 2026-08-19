# Ojiro Board — Artisan / Graduate Job Board

**3MTT NextGen Capstone Project — Software Development track**
**Brief SD-16 — Artisan/Graduate Job Board**
Fellow: Kefas Ayuba (FE/23/31738291) — Almara Hub, Kaduna

## The problem this solves

In Nigeria, jobs and talent don't meet. Employers who need an electrician, a
tailor, or a graduate for admin work post to WhatsApp statuses and Facebook
groups that disappear in a day. Artisans and graduates looking for work have
no single place to search by trade, by state, or by pay. Ojiro Board is a
small, focused noticeboard that fixes that: post a job, search jobs, apply,
done. No CV upload portals, no sign-up walls.

## What it does (MVP features, matching the brief)

- **Posts** — anyone can post a job or gig with a category, job type
  (full-time, part-time, contract, one-off gig, apprenticeship), state, LGA,
  pay, description, and contact details.
- **Search** — free-text search across title, description and poster name,
  plus filters for category, state and job type.
- **Applications** — anyone can apply to a post directly from the browser
  (name, phone, cover note, optional portfolio link) or reach the poster
  straight away by phone call or WhatsApp.
- **No login system, but posts are still protected** — when you post a job
  you're given a one-time management code. That code is the only way to see
  who applied or take the post down. This keeps the MVP simple (no
  accounts, no passwords) while still giving posters control of their own
  listing.

## Why it fits the Nigerian context

- Categories cover real Nigerian trades (electrician, generator/AC
  technician, tailor, mechanic, welder, mason, hairdresser/barber) side by
  side with graduate roles (IT, sales, admin, teaching, NYSC-type postings).
- Pay is written in naira, free text (`₦15,000` or `Negotiable`), because
  most artisan gigs are priced by the job, not a fixed monthly figure.
- Every listing has a one-tap WhatsApp button, since that's how most hiring
  conversations in Nigeria actually happen, not email.
- State and LGA fields reflect how Nigerians actually describe location.

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — a real relational database,
  one file, nothing extra to install or pay for
- **Frontend:** Plain HTML, CSS and JavaScript (no framework, no build
  step) — this keeps the project easy to read end to end and easy to
  deploy anywhere that runs Node
- **Everything runs as one web service** — the Express server serves both
  the API and the static frontend, so there's only one thing to deploy

## Project structure

```
artisan-job-board/
├── server.js        # Express app: all API routes
├── db.js             # SQLite connection + table setup
├── package.json
├── public/
│   ├── index.html     # Page structure and the 4 modals (post, code, detail, manage)
│   ├── style.css       # Visual design (indigo/ochre "signboard" identity)
│   └── app.js          # All frontend logic (fetch calls, rendering, forms)
└── README.md
```

## Running it on your own computer

You need [Node.js](https://nodejs.org) version 18 or newer installed.

```bash
cd artisan-job-board
npm install
npm start
```

Then open `http://localhost:3000` in your browser. A file called `data.db`
will appear in the folder — that's your SQLite database. Delete it any time
to start with a clean board.

## Deploying it for free (so you have a real link to submit)

The easiest free option for a Node + SQLite app like this is **Render**.

1. Push this folder to a new GitHub repository (public, or private with
   Render given access).
2. Go to [render.com](https://render.com) and sign up (free, no card
   needed for the free tier).
3. Click **New +** → **Web Service**, connect your GitHub repo.
4. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Click **Create Web Service**. Render will build and give you a live
   URL like `https://ojiro-board.onrender.com`.

**One honest limitation to know before you submit:** Render's free tier
does not keep a persistent disk, so the SQLite file can reset when the
free service restarts or goes idle. For a capstone demo this is fine —
post a couple of jobs right before you record your demo video and take
your screenshots. If you want the data to survive long-term, either
upgrade to Render's paid tier with a persistent disk, or move the same
`better-sqlite3` calls in `db.js` to a hosted Postgres database (Render
also gives a free Postgres instance for 90 days) — the rest of the app
does not need to change for that.

Railway.app is a solid alternative and does support persistent volumes
on its free trial, if you'd rather your data survive restarts from day one.

## API reference (for your own understanding, and for the demo video)

| Method | Route | What it does |
|---|---|---|
| GET | `/api/jobs?search=&category=&state=&jobType=` | List/search/filter jobs |
| GET | `/api/jobs/:id` | Get one job's full detail |
| POST | `/api/jobs` | Create a job posting, returns a management code |
| DELETE | `/api/jobs/:id` | Delete a job (requires the correct management code) |
| POST | `/api/jobs/:id/apply` | Submit an application to a job |
| GET | `/api/jobs/:id/applications?manageCode=` | View applicants (requires the correct management code) |
| GET | `/api/stats` | Total jobs and applications, shown in the header |

## What I would build next, given more time

- Employer accounts with real authentication, so a management code isn't
  the only safeguard.
- Image upload for a work sample or a business logo.
- SMS notification to the poster when someone applies (many artisans in
  the target audience check SMS more reliably than email).
- Pagination once the number of listings grows past a page or two.

## A note on how this was built

I used Claude (Anthropic's AI assistant) to help me write and structure
this code faster than I could have alone. Every route was tested end to
end before I called it done. I understand what each part of the code
does and can walk through it live, which is what the demo video is for.
