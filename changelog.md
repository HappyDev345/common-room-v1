# Changelog

All notable changes to Common Room are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How versions are numbered

| Part      | Increase it when                                                                                          | Example                                  |
| --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **MAJOR** | A change needs manual work to upgrade, such as a database change migrated by hand, or a feature is removed | Changing how balances are stored         |
| **MINOR** | A new feature is added and nothing breaks                                                                 | A new committee tab or student page      |
| **PATCH** | Bug fixes, security fixes, infrastructure or documentation changes                                         | Moving the database to a different region |

Allowed headings under each version: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.

## [Unreleased]

Nothing yet. Add new entries here as you work, then move them under a version heading when you release.

## [1.0.1] - 2026-11-27

### Changed

- Moved the production database from Supabase's Southeast Asia region to **Sydney (ap-southeast-2)** for lower latency for Australian users. No application code changed. The environment variables `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` now point at the new project, and `SESSION_SECRET` was kept so nobody was signed out.
- Vercel function region should be set to **Sydney (`syd1`)** so the server runs next to the database.
- The database setup script moved out of the README into `documentation/schema.sql`.
- README updated for the new region, the Vercel `NEXT_PUBLIC_` variable rule, backup safety (the repository is public), and documentation links.

### Added

- `documentation/schema.sql`: full database setup, now including `grant select, insert, update, delete on all tables in schema public to service_role` and a revoke from `anon` and `authenticated`. Supabase projects created after 30 May 2026 no longer grant API roles access to new tables automatically.
- **Committee Guide** (PDF): step-by-step guide for committee members.
- **Software Documentation** (PDF): architecture, data model, security, deployment, runbooks and troubleshooting, including how to move the database to a new region.
- This changelog and a documented release process.

### Fixed

- Documented the cause and fix for sign-in failing with "invalid username or password" when the real cause is `permission denied for table ...` (Postgres error 42501) on a new Supabase project.

## [1.0.0] - Baseline

The first documented version. Earlier history was not tracked in a changelog, so this entry summarises everything the system did when version numbering began.

### Added

- **Student area** (mobile friendly): dashboard with available and held points, jobs, rewards, leaderboard, feedback and account pages.
- **Committee area**: overview, award points, review queue, inbox, students, bulk student creation (with downloadable CSV), jobs and rewards management, challenges, announcements and settings.
- **Points ledger**: append-only `transactions` table with balances calculated from it, held points for pending reward requests, and idempotent reviews so a request can only be decided once.
- **Challenges** with one-time payouts to every student.
- **Leaderboard** by points earned, switchable by the committee (off by default).
- **Roles**: student, committee and admin, checked on the server for every request with `requireRole()`.
- **Security**: bcrypt password hashing, signed HttpOnly session cookies, login rate limiting (8 attempts per username or 100 per IP in 15 minutes), and a database closed to public access with row level security.
- **Audit log** (admins only) with an optional live feed to a private Discord channel.
- **Suggestions and reports** with statuses, replies, a daily limit, an option to hide the sender's name from the committee, and extra privacy for behaviour reports.
- Link preview image and metadata for sharing.

[Unreleased]: https://github.com/HappyDev345/common-room-v1/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/HappyDev345/common-room-v1/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/HappyDev345/common-room-v1/releases/tag/v1.0.0