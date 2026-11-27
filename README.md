# Common Room

A points, rewards and community platform for the Year 12 common room.
Students earn points for helping out and spend them on rewards. The committee runs everything from one place.

![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Hosted_on-Vercel-black?logo=vercel)
![Version](https://img.shields.io/badge/version-1.0.1-4F46E5)

---

## Contents

- [What it does](#what-it-does)
- [How points work](#how-points-work)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Project structure](#project-structure)
- [Roles and permissions](#roles-and-permissions)
- [Security model](#security-model)
- [Audit log](#audit-log)
- [Suggestions and reports](#suggestions-and-reports)
- [Deploying to Vercel](#deploying-to-vercel)
- [Running it day to day](#running-it-day-to-day)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)
- [Versioning](#versioning)

---

## What it does

Common Room has two experiences in one website. Each person only sees the tools for their role.

### Students

| Page            | What students can do                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**   | See available points, points held for pending reward requests, recent activity, request status, announcements and challenges |
| **Jobs**        | Submit a finished job and track it while it waits for review                                                                 |
| **Rewards**     | Browse rewards and request one (the cost is held straight away)                                                              |
| **Leaderboard** | See the top 10 by points earned and their own rank, only when the committee turns it on                                      |
| **Feedback**    | Send a suggestion or a report, and see the status and the committee's reply                                                  |
| **Account**     | Change their own password                                                                                                    |

The student area is built to work well on a phone, with a bottom navigation bar on small screens.

### Committee

| Area               | What the committee can do                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Overview**       | See student count, pending reviews and recent activity                                                                   |
| **Award Points**   | Give or take away points with a recorded reason                                                                          |
| **Review Queue**   | Approve or decline job submissions and reward requests. A reason is required when declining, and the student sees it     |
| **Inbox**          | Read suggestions and reports, set a status and reply to the student                                                      |
| **Students**       | Search every balance by name or username, and reset a forgotten password                                                 |
| **Add Students**   | Create accounts in bulk from a pasted list of names, with generated usernames and random passwords (downloadable as CSV) |
| **Jobs / Rewards** | Add, edit, hide or show items, and choose which jobs students can submit themselves                                      |
| **Challenges**     | Set shared goals, track progress and pay out a reward to every student once                                              |
| **Announcements**  | Post updates that appear on every student dashboard                                                                      |
| **Settings**       | Turn the leaderboard on or off                                                                                           |
| **Audit Log**      | Admins only: a permanent record of who did what and when, with an optional live feed to a private Discord channel        |
| **My Account**     | Change their own password                                                                                                |

---

## How points work

- **The ledger is the source of truth.** A student's balance is never stored as a number. It is the sum of every row in `transactions`, and each row records the amount, reason, who made it and when.
- **Nothing is edited or deleted.** Mistakes are fixed by adding a correcting transaction, so history can always be traced.
- **Held points.** Requesting a reward holds its cost immediately, so the same points cannot be spent twice. `available = balance - points held by pending requests`.
- **Approving a job** adds the job's points. **Approving a reward** deducts its cost. **Declining a reward** releases the held points.
- **One review only.** Review updates only apply while a request is still `pending`, so a double-click cannot award or deduct twice.
- **Leaderboard** ranks by total points earned (positive transactions), so spending on rewards does not push a student down the table.
- **Challenge payouts** can only happen once. The challenge is marked completed first, then one transaction is written per student. If that fails, the challenge is put back to active.

---

## Tech stack

| Layer     | Technology                            |
| --------- | ------------------------------------- |
| Framework | Next.js (App Router) with TypeScript  |
| Styling   | Tailwind CSS                          |
| Database  | PostgreSQL on Supabase                |
| Passwords | bcryptjs                              |
| Sessions  | Signed, HttpOnly cookies using `jose` |
| Hosting   | Vercel                                |

The browser never talks to the database. Every request goes through a Next.js API route that checks the session first, then uses the Supabase **service role** key on the server.

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- A free [Supabase](https://supabase.com) project
- Git

### Run it locally

```bash
git clone https://github.com/HappyDev345/common-room-v1.git
cd common-room-v1
npm install
```

1. Create the database tables (see [Database setup](#database-setup)).
2. Create a `.env.local` file in the project root (see [Environment variables](#environment-variables)).
3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the admin account you created.

### Useful scripts

| Command         | What it does                                                 |
| --------------- | ------------------------------------------------------------ |
| `npm run dev`   | Start the development server                                 |
| `npm run build` | Create a production build (also a good check before pushing) |
| `npm start`     | Run the production build locally                             |
| `npm run lint`  | Run the linter                                               |

---

## Environment variables

Create `.env.local` in the project root. **Never commit this file.**

```bash
# Supabase project URL (Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase service role key (Project Settings > API). Server only, keep it secret.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Long random string used to sign login cookies
SESSION_SECRET=your-long-random-string

# Optional: Discord webhook for the admin audit feed (see Audit log)
DISCORD_WEBHOOK_URL=
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variable                    | Used for                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Address of your Supabase project                                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY` | All database access, from the server only. Has full access, so never expose it to the browser                              |
| `SESSION_SECRET`            | Signing login cookies. Changing it signs everyone out                                                                      |
| `DISCORD_WEBHOOK_URL`       | Optional. Posts audit events to a private Discord channel. Anyone with this URL can post to the channel, so keep it secret |

> **Vercel note:** Vercel will not let you mark a `NEXT_PUBLIC_` variable as sensitive, because those values are sent to the browser by design. Save `NEXT_PUBLIC_SUPABASE_URL` as a **Config** variable. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` as **Sensitive**.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may also appear in older setups. The app does not currently use it.

---

## Database setup

1. In the Supabase dashboard, create a project. Choose the region closest to your users (for Australia, **Oceania / Sydney**).
2. Open the **SQL Editor**, paste in the whole of [`documentation/schema.sql`](documentation/schema.sql) and run it. It creates every table, the `student_balances` view, locks the tables down so only the server can use them, and gives the server access.

> **Important for projects created after 30 May 2026.** Supabase no longer lets its API roles use new tables automatically. Without an explicit grant, every request fails with `permission denied for table ...` (error `42501`), and the login page just says "invalid username or password". `schema.sql` already includes the grant to `service_role`. If you add a table later, grant it too:
>
> ```sql
> grant select, insert, update, delete on table public.your_table to service_role;
> ```

### Create the first admin account

1. Generate a password hash from inside the project folder:

   ```bash
   node -e "require('bcryptjs').hash('choose-a-strong-password', 10).then(console.log)"
   ```

2. Insert the admin, pasting the hash in:

   ```sql
   insert into users (first_name, last_name, username, password_hash, role)
   values ('Admin', 'User', 'admin', 'PASTE_THE_HASH_HERE', 'admin');
   ```

3. Sign in, open **My Account** and change the password to one only you know.

### Optional starter content

```sql
insert into jobs (name, description, points) values
  ('Tidy common room', 'General tidy up of the space', 10),
  ('Restock fridge', 'Refill the drinks fridge', 8),
  ('Wipe tables', 'Clean down all the tables', 5);

insert into rewards (name, description, cost) values
  ('Cafe voucher', 'A voucher for the cafe', 20),
  ('Pizza day vote', 'Vote on the next pizza day', 10);
```

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  Login page
│   ├── layout.tsx                Root layout and share-preview metadata
│   ├── (student)/                Student area, shares one layout (sidebar and sign-in check)
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── rewards/
│   │   ├── leaderboard/
│   │   ├── feedback/
│   │   └── account/
│   ├── committee/                Committee dashboard (tabbed)
│   └── api/
│       ├── auth/                 login, logout, me, change-password
│       ├── committee/            award, submissions, redemptions, students, transactions,
│       │                         create-students, reset-password, jobs, rewards,
│       │                         announcements, challenges, settings
│       └── ...                   summary, jobs, rewards, submissions, redemptions,
│                                 announcements, challenges, leaderboard (student-facing)
├── components/
│   ├── StudentShell.tsx          Student layout and useStudent() hook
│   ├── ChangePasswordForm.tsx
│   └── committee/                ItemsManager, AnnouncementsManager,
│                                 ChallengesManager, SettingsPanel, AuditLog,
│                                 FeedbackInbox
└── lib/
    ├── session.ts                Cookie sessions and requireRole() guard
    ├── audit.ts                  logAudit(): saves an event and posts it to Discord
    ├── audit-meta.ts             Event types, labels, emoji and colours
    ├── discord.ts                Sends embeds to the Discord webhook
    ├── feedback-meta.ts          Suggestion and report categories and statuses
    ├── supabase-server.ts        Service-role database client (server only)
    └── supabase.ts               Public client (not currently used)

documentation/                    Database setup script and the printable guides
public/
└── og-image.png                  Link preview image (1200 x 630)
```

The `(student)` folder is a Next.js route group. The brackets keep the files organised without changing the web addresses, so `/dashboard` is still `/dashboard`.

---

## Roles and permissions

| Role          | Can do                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| **student**   | View their own data, submit jobs, request rewards, view challenges and announcements, change their own password |
| **committee** | Everything in the committee area, including creating students and resetting **student** passwords               |
| **admin**     | Everything a committee member can do, plus resetting **any** account's password and viewing the audit log       |

Committee and admin accounts are created by promoting an existing student in the SQL Editor:

```sql
update users set role = 'committee' where username = 'their_username';
```

Use `'admin'` instead of `'committee'` for an admin. Every committee member should change their password under **My Account** straight away.

---

## Security model

- **Passwords** are hashed with bcrypt and never stored or logged in plain text. New passwords must be at least 8 characters, and generated passwords are random.
- **Sessions** are signed, `HttpOnly` cookies (7 days, `SameSite=Lax`, `Secure` in production). The token only holds the user ID. The role is looked up from the database on every request, so changes and deleted accounts take effect immediately.
- **Every API route checks the session on the server** with `requireRole()`. User IDs are never trusted from the request, so one student cannot ask for another student's data.
- **The database is closed to the public.** Row Level Security is on with no policies, and the balances view has public access revoked. Only the server's service role key can read or write.
- **Login rate limiting.** 8 failed attempts on one username, or 100 from one IP address, within 15 minutes triggers a 15 minute block. The limits are set at the top of `src/app/api/auth/login/route.ts`.
- **Reviews are idempotent.** Approving or declining only applies to a request that is still pending.
- **Secrets stay on the server.** `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` are never sent to the browser.
- **Data collected is minimal.** First name, last name, username and a hashed password. No emails, phone numbers or school ID numbers.

If you believe you have found a security problem, please tell the maintainer directly rather than opening a public issue.

---

## Audit log

Every important action is recorded in the `audit_log` table, with the person who did it, the person it affected, the details, and the time. Admins can read it under **Audit Log** in the committee dashboard, filtered by category.

| Category                | Events                                                          |
| ----------------------- | --------------------------------------------------------------- |
| Points                  | Awarded, deducted (with reason and new balance)                 |
| Jobs                    | Submitted, approved, declined, created, updated                 |
| Rewards                 | Requested, approved, declined, created, updated                 |
| Accounts                | Students created, password reset by committee, password changed |
| Challenges              | Created, progress updated, completed and paid out, removed      |
| Announcements           | Posted, deleted                                                 |
| Settings                | Leaderboard turned on or off                                    |
| Suggestions and reports | Sent, and status or reply updated                               |
| Security                | Sign-ins, and sign-in lockouts                                  |

Passwords are never written to the log. Names are saved as they were at the time, so entries still make sense if an account is later deleted.

### Discord feed (optional)

When `DISCORD_WEBHOOK_URL` is set, each event is also posted to a private Discord channel as a colour-coded embed. Sign-ins are saved to the log but not posted. To change which events post, edit the `discord` flag for each event in `src/lib/audit-meta.ts`.

1. In Discord, open your private admin channel, then **Edit Channel > Integrations > Webhooks > New Webhook**.
2. Copy the webhook URL.
3. Add it as `DISCORD_WEBHOOK_URL` in `.env.local` and in the Vercel environment variables, then redeploy.
4. Open **Audit Log** and click **Send test message**.

Mentions such as `@everyone` in anything a user types are switched off in the messages, so they cannot ping anyone. Logging never blocks an action: if the database or Discord is unavailable, the action still goes through and the problem is written to the server logs.

---

## Suggestions and reports

Students have a **Feedback** page with two options, and the committee reads everything in the **Inbox** tab.

| Type       | Categories                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| Suggestion | New job idea, new reward idea, other suggestion                               |
| Report     | Supplies needed, something broken or unsafe, behaviour or rules, other report |

- Each item has a status (new, looking into it, done, not going ahead) and an optional reply. Students see both on their Feedback page.
- A student can send up to 5 a day.
- **Hide my name.** When sending a report, a student can hide their name from the committee. Admins can still see it, and the form tells students this, so it is only for dealing with misuse.
- **Privacy for behaviour reports.** The text of a behaviour report is not copied to Discord or the audit log, which only record that one was sent. It is only readable in the Inbox.
- The form tells students to speak to a teacher about anything serious or urgent, and the Inbox reminds the committee to handle behaviour reports carefully.

Because reports can name other students, agree as a committee who reads them and what happens next before turning this on for everyone.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel choose **Add New > Project** and import the repository. Next.js is detected automatically.
3. Add the [environment variables](#environment-variables) before the first deploy.
4. Set **Project Settings > Functions > Function Region** to the region closest to your Supabase project (**Sydney, `syd1`** when the database is in Sydney). A server far from the database makes every page noticeably slower.
5. Click **Deploy**. Every push to the main branch redeploys automatically.

**Tips**

- Environment variable changes only apply to new builds, so **redeploy** after changing one.
- Link previews use `metadataBase` in `src/app/layout.tsx`. If the site ever moves to a custom domain, update it there.
- Vercel's free Hobby plan is for non-commercial use only.

---

## Running it day to day

- **Adding students:** Committee dashboard > **Add Students**. Passwords are shown once, so download the CSV straight away and hand each student only their own details.
- **Forgotten password:** Committee dashboard > **Students** > **Reset password**.
- **Locked out after too many attempts:** wait 15 minutes. To clear it immediately, run `delete from login_attempts;` in the SQL Editor.
- **Backups:** Supabase's free plan does not include automatic backups. Once a term, run `pg_dump "$DB_URL" --no-owner -f backup.sql` using the **Session pooler** connection string. Keep the file private and **never commit it**, because this repository is public and the dump contains student names and password hashes.
- **Free-plan pausing:** Supabase pauses free projects after a week of inactivity, which school holidays can trigger. If the site stops working after a break, check the project in the Supabase dashboard and restore it if it is paused.
- **Moving the database to another region:** see the runbook in the Software Documentation PDF.

---

## Known limitations

- Reward stock is not tracked. Hide a reward manually when it runs out.
- Committee accounts are created with a SQL statement, not from inside the site.
- There is no email-based password recovery. The committee resets passwords instead.
- Sessions last 7 days and cannot be revoked one by one. Deleting a user, or changing `SESSION_SECRET`, signs people out.
- Rate limiting covers sign-in only.
- Some committee screens load their data when the page opens, so the Review Queue needs a refresh to show new requests.
- There are no automated tests yet.

---

## Documentation

| Document                                                                                                | Audience             | What it covers                                                                                                |
| ------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Committee Guide (PDF)](documentation/Common-Room-Committee-Guide.pdf)                                   | The committee        | Step-by-step use of every tool, handling reports, good practice, troubleshooting                              |
| [Software Documentation (PDF)](documentation/Common-Room-Software-Documentation.pdf)                     | Whoever maintains it | Architecture, data model, business rules, security, deployment, runbooks, troubleshooting, release process    |
| [`documentation/schema.sql`](documentation/schema.sql)                                                  | Setup                | Complete database setup script                                                                                |
| [CHANGELOG.md](CHANGELOG.md)                                                                            | Everyone             | What changed in each version                                                                                  |

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) and keeps a [changelog](CHANGELOG.md) in the [Keep a Changelog](https://keepachangelog.com/) format.

- **MAJOR**: a change that needs manual work to upgrade (for example a database change that must be migrated by hand)
- **MINOR**: a new feature that does not break anything
- **PATCH**: bug fixes, security fixes, infrastructure or documentation changes

To release: update `CHANGELOG.md`, then run `npm version patch` (or `minor` / `major`) and `git push --follow-tags`.

---

## Licence

No licence has been chosen yet. Until one is added, all rights are reserved by the author.

## Author

Built by Luke for the Year 12 Common Room.