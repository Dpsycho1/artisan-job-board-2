# Capstone Submission Guide — Kefas Ayuba, Brief SD-16

Deadline: **Friday, 21 August 2026**. Do not wait until the last day —
deploying and recording can throw up small surprises, give yourself a
buffer.

---

## 1. What you still need to do, in order

1. Run the app locally once (`npm install`, `npm start`) and click through
   every feature yourself, so you can speak about it confidently.
2. Push the code to a GitHub repository.
3. Deploy it on Render (steps in README.md) and get your live link.
4. Post 2–3 sample jobs on the live version so the board isn't empty when
   you record.
5. Record your demo video (script below).
6. Upload the video to YouTube (set to "Unlisted", not Private, so the
   link works for anyone) or to Google Drive with sharing set to "Anyone
   with the link".
7. Fill in the Google Form (answers drafted below).
8. Submit before 21 August. Don't wait for the deadline day.

---

## 2. Demo video script (aim for 2:30–3:00)

Read this once, then talk it in your own words on camera — don't read it
word for word, the reviewers can tell, and you need to sound like you
understand what you built, because you do.

**Opening (0:00–0:20)**
"Hi, I'm Kefas Ayuba, Fellow ID FE/23/31738291, on the Software
Development track at Almara Hub. My capstone brief is SD-16, the
Artisan/Graduate Job Board. The problem it solves is simple: in Nigeria,
jobs and skilled people don't find each other easily. Job posts scatter
across WhatsApp statuses and Facebook groups and vanish in a day. I built
Ojiro Board, a focused noticeboard for that."

**Browsing and search (0:20–0:50)**
Screen-share the homepage. "Here's the board. Anyone can search by
keyword, or filter by category, state, and job type, without creating an
account." Do a live search (e.g. type "generator") and apply a filter so
the list visibly updates.

**Posting a job (0:50–1:30)**
Click "Post a notice", fill the form on screen with a real example (an
artisan job, since that's the brief's focus — e.g. a tailor or mechanic
gig in Kaduna). Submit it. "When you post, you get a one-time management
code instead of creating an account. That code is the only way to see who
applied later or take the post down — it keeps the MVP simple without
leaving posts open for anyone to edit."

**Applying to a job (1:30–2:05)**
Open a job, show the "Call" and "WhatsApp" buttons. "Someone can reach the
poster directly, or apply right here on the board." Fill and submit the
apply form.

**Owner view (2:05–2:30)**
Go back to the job you posted, click "I posted this — manage it", enter
the management code, show the applicant appear. "This is how the poster
sees who applied, using the code from earlier."

**Tech and close (2:30–2:55)**
"It's built with Node and Express on the backend, a SQLite database, and
plain HTML, CSS and JavaScript on the frontend, so it's easy to read
end to end and deploy anywhere Node runs. I used AI-assisted tooling to
move faster while building it, and tested every feature myself before
submitting. Thank you."

---

## 3. Google Form answers

Copy these into the form. Fields marked **[FILL IN]** need your own input
— I don't have reliable, verified information for those, so don't let me
guess on your behalf.

| Field | Answer |
|---|---|
| Name of Fellow | Kefas Ayuba |
| Email | ay.kefas@gmail.com |
| Fellow ID | FE/23/31738291 |
| State | Kaduna |
| Name of ALC | Almara Hub |
| State (2nd instance, if repeated) | Kaduna |
| LGA | **[FILL IN — your specific LGA in Kaduna]** |
| Title of assigned Project | SD-16: Artisan/Graduate Job Board |
| Brief description of your project | Ojiro Board is a web-based job noticeboard connecting Nigerian artisans and graduates with people who need their skills. Users can post jobs with category, location and pay, search and filter listings, and apply directly or contact the poster by phone or WhatsApp. Built with Node.js, Express and SQLite. |
| Link to your Capstone Project | **[FILL IN — your Render/Railway live URL, after deployment]** |
| Link to your demo video | **[FILL IN — your YouTube unlisted or Google Drive link, after recording]** |
| Questions/Feedback/Suggestions | Optional — leave blank or add anything genuine you want to flag. |

---

## 4. How this maps to the scoring rubric

From the scoring guide you shared, this is graded two ways:

**A. Validity checklist (all must be YES for it to count):**
Registered fellow, matches your assigned brief (SD-16), has a working
deliverable, has a 2–3 min demo video where you explain your own work,
and is original, not copied.

**B. Quality rubric, weighted to 100:**

| Criterion | Weight | Where it comes from in this build |
|---|---|---|
| Adherence to Brief & Completeness | 20% | Posts, search, applications, deploy — all present |
| Functionality / Effectiveness | 25% | Every route was tested end to end (create, search, apply, manage-code view, delete) before handoff |
| Technical Quality / Craft | 15% | Real SQLite database, input validation, clean route structure |
| User Experience / Clarity | 15% | Search/filter bar, clear forms, mobile-responsive layout |
| Innovation & Nigerian-Context Fit | 10% | Naira pay field, WhatsApp contact button, artisan trade categories, state/LGA fields |
| Documentation & Demo Video | 15% | README.md explains setup, deployment and structure; video script above |

The honest gap is entirely in your hands now: you have to actually run
it, understand it, and be able to answer a question about it on camera or
in person. A working app with a shaky, uncertain explanation will score
worse on "Documentation & Demo Video" and risks the "Original Work" check
than a slightly simpler app you can explain fluently. Spend your
remaining time on understanding the code and rehearsing the video, not on
adding more features.
