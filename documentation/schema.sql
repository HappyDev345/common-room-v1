-- ============================================================================
-- Common Room: database setup
-- Run once in the Supabase SQL Editor of a NEW, empty project.
-- ============================================================================

-- ============ Accounts ============
create table users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null default 'student' check (role in ('student', 'committee', 'admin')),
  created_at timestamptz default now()
);

-- ============ Points ledger (rows are never edited or deleted) ============
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  amount integer not null,
  reason text not null,
  awarded_by uuid references users(id),
  created_at timestamptz default now()
);

-- ============ Rewards and redemption requests ============
create table rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cost integer not null,
  available boolean default true,
  stock integer,
  created_at timestamptz default now()
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  reward_id uuid not null references rewards(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  reviewed_by uuid references users(id),
  decline_reason text,
  created_at timestamptz default now()
);

-- ============ Jobs and job submissions ============
create table jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  points integer not null,
  student_submittable boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

create table job_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  job_id uuid not null references jobs(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  reviewed_by uuid references users(id),
  decline_reason text,
  created_at timestamptz default now()
);

-- ============ Announcements, challenges, settings ============
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal integer not null check (goal > 0),
  progress integer not null default 0,
  reward_points integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table settings (
  key text primary key,
  value text not null
);

insert into settings (key, value) values ('leaderboard_enabled', 'false');

-- ============ Login rate limiting ============
create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index login_attempts_username_idx on login_attempts (username, created_at);
create index login_attempts_ip_idx on login_attempts (ip, created_at);

-- ============ Suggestions and reports ============
create table feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references users(id) on delete set null,
  type text not null check (type in ('suggestion', 'report')),
  category text not null check (category in (
    'job_idea', 'reward_idea', 'other_suggestion',
    'supplies', 'broken', 'behaviour', 'other_report'
  )),
  message text not null,
  hide_name boolean not null default false,
  status text not null default 'new' check (status in ('new', 'reviewing', 'done', 'dismissed')),
  response text,
  responded_by uuid references users(id) on delete set null,
  responded_at timestamptz
);

create index feedback_status_idx on feedback (status, created_at desc);
create index feedback_user_idx on feedback (user_id, created_at desc);

-- ============ Audit log (append-only record of what happened) ============
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  actor_id uuid references users(id) on delete set null,
  actor_name text,
  actor_role text,
  target_user_id uuid references users(id) on delete set null,
  target_name text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  ip text
);

create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_action_idx on audit_log (action, created_at desc);

-- ============ Balances view (Students list and leaderboard) ============
create view student_balances as
select
  u.id, u.first_name, u.last_name, u.username,
  coalesce(sum(t.amount), 0)::int as balance,
  coalesce(sum(t.amount) filter (where t.amount > 0), 0)::int as earned
from users u
left join transactions t on t.user_id = u.id
where u.role = 'student'
group by u.id;

-- ============ Lock everything down ============
-- Row Level Security on with no policies means the public API key can read nothing.
alter table users enable row level security;
alter table transactions enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table jobs enable row level security;
alter table job_submissions enable row level security;
alter table announcements enable row level security;
alter table challenges enable row level security;
alter table settings enable row level security;
alter table login_attempts enable row level security;
alter table audit_log enable row level security;
alter table feedback enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- ============ Let the server in (and only the server) ============
-- Projects created after 30 May 2026 no longer grant API roles access to new
-- tables automatically. Without this, every request fails with
-- "permission denied for table ..." (Postgres error 42501).
-- Only service_role gets access. anon and authenticated stay locked out.
grant select, insert, update, delete on all tables in schema public to service_role;

-- ============ Check (run separately; both should be false / empty) ============
-- select has_table_privilege('anon', 'student_balances', 'select');
-- select has_table_privilege('anon', 'users', 'select');