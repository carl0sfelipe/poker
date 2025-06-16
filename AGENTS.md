# AGENTS.md – Poker Tourney Manager

> **Purpose:** Instruct an autonomous coding agent (e.g. OpenAI Codex, Dev‑GPT, etc.) to build and extend the Poker Tourney Manager MVP in an efficient, deterministic way. This file is the single source of truth for requirements that are **implementation‑ready**. Treat all unchecked boxes as TODOs.

---

## 1. System Snapshot

* **Stack**
  `React 18 + Vite + Tailwind` → `Node.js 20 (Express BFF)` → `Supabase (PostgreSQL 15)`
  State: `Zustand`. Auth: Supabase Auth (JWT).
  Deploy: Docker → Fly.io.
* **Roles**
  `admin`, `staff`, `dealer`, `player` (a.k.a. *user*).
* **Schema v0.3** (mirrors Supabase). Keys are `uuid` unless noted.

```text
users ─┐                tournaments ─┐
       └─< registrations >──────────┘
```

| Table             | Fields (non‑PK only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Notes                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **users**         | `email text`, `password_hash text`, `role text`, `name varchar`, `created_at timestamptz`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Role ENUM 👆                                    |
| **tournaments**   | `name text`, `start_time timestamptz`, `starting_stack int4`, `blind_structure jsonb`, `status text`, `bonuses jsonb`, `addon jsonb`, `rebuy jsonb`, `rebuy_max_level int4`, `max_stack_for_single_rebuy int4`, `addon_break_level int4`, `current_level int4`, `current_blind_index int4`, `is_break bool`, `buy_in int4`, `addon_bonuses jsonb`, `multiplier numeric`                                                                                                                                                                       | `status` ENUM: *planned*, *running*, *finished* |
| **registrations** | `user_id`, `tournament_id`, `checked_in bool`, `seat_number int4`, `table_number int4`, `finish_place int4`, `current_stack int4`, `selected_bonuses text[]`, `rebuys jsonb`, `addon_used bool`, `single_rebuys int4`, `double_rebuys int4`, `eliminated bool`, `stack_at_rebuy int4`, `elimination_level int4`, `last_rebuy_level int4`, `elimination_order int4`, `rebuys_paid bool`, `addon_paid bool`, `payment_status text`, `payment_timestamp timestamptz`, `paid_bonuses jsonb`, `bonus_addons_used text[]`, `created_at timestamptz` | FK on delete cascade.                           |

> **Row‑Level Security (RLS)** rules MUST ensure users can only see rows with same `id` OR tournaments where they are registered, except admins.

---

## 2. High‑Level Acceptance Criteria (MVP)

* [ ] **Auth flow** via Supabase Auth, email/password only. 🔒
* [ ] **CRUD Tournaments** (admin/staff): create → edit → soft‑delete.
* [ ] **Self‑registration** to tournaments (player) until `late_reg_end` (derived from blind structure).
* [ ] **Rebuy / Add‑on / Elimination** endpoints & UI actions execute in ≤ 300 ms.
* [ ] **Blind timer** (server derives `current_level`, FE renders full‑screen TV mode; emits WebSocket `blindUp` event).
* [ ] **Auto‑payout calculator** uses configured percentages.
* [ ] **Ranking service** recomputes points after every tournament finish and caches monthly + semester boards.
* [ ] **CSV export** endpoint `/tournaments/:id/export` yields ISO‑8601 timestamped file.

> Unit tests ≥ 80 % coverage on business services.
> Cypress E2E: login, create tourney, register 2 players, finish tournament, verify ranking.

---

## 3. API Contract (REST‑like)

| Verb  | Path                           | Auth        | Purpose                    |
| ----- | ------------------------------ | ----------- | -------------------------- |
| POST  | `/auth/signup`                 | –           | New account (player)       |
| POST  | `/auth/login`                  | –           | JWT                        |
| POST  | `/tournaments`                 | admin,staff | Create tournament          |
| GET   | `/tournaments`                 | any         | List visible tournaments   |
| PATCH | `/tournaments/:id`             | admin,staff | Update fields (see schema) |
| POST  | `/tournaments/:id/register`    | player      | Join tournament            |
| POST  | `/registrations/:id/rebuy`     | staff       | Record rebuy               |
| POST  | `/registrations/:id/addon`     | staff       | Record add‑on              |
| POST  | `/registrations/:id/eliminate` | staff       | Mark eliminated            |
| POST  | `/tournaments/:id/finish`      | staff       | Auto‑rank & payout         |
| GET   | `/ranking?period=monthly`      | any         | Leaderboard                |
| GET   | `/tournaments/:id/export`      | admin,staff | CSV download               |

JSON schemas reside in `api-contract/*.json` (generate).

---

## 4. Front‑End Work Breakdown

### 4.1 Pages & Routes

* `/login`, `/signup`
* `/dashboard` *(list & quick actions)*
* `/tournaments/:id`
* `/tournaments/:id/admin` *(staff cockpit)*
* `/ranking` *(filters: month, semester)*
* `/clock/:id` *(TV full‑screen timer, read‑only)*

### 4.2 Components

* `<BlindClock>` ↔ WebSocket `blindUp`
* `<RebuyDialog>` & `<AddonDialog>`
* `<EliminationTable>` sortable
* `<RankTable>` paginated

Use Tailwind + shadcn/ui (`Dialog`, `Table`, `Button`).

---

## 5. Coding Conventions

* TypeScript strict mode everywhere.
* ESLint + Prettier config in repo root (extend `airbnb-typescript`).
* Commit message style: Conventional Commits.
* Branch naming: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`.

---

## 6. Milestones & Sprint 0 TODO

1. **Setup repo** with Turbo monorepo (`apps/web`, `apps/api`, `packages/db`).
2. Scaffold Supabase with provided schema SQL (see `infra/001_init.sql`).
3. Implement Auth flow front & back.
4. CRUD tournaments + basic list page.
5. Registration flow & initial blind clock prototype.
6. Rebuy/Add‑on/Elimination endpoints + UI hooks.
7. Auto‑finish routine & ranking service.
8. Polish, responsive pass, Cypress tests.

---

## 7. Guidance to Codex

* Always run `pnpm test` before proposing PR.
* Prefer SQL `jsonb` operators (`\u003E`, `\u003E\u003E`) over full row fetch when updating partial `blind_structure`.
* Keep server‑side logic idempotent—multiple identical rebuy requests must NOT create duplicates.
* Use Supabase PostgREST realtime channel for `blindUp` broadcast.

**If any requirement is ambiguous, create a GitHub Issue with label `clarification` instead of guessing.**

---

### END
