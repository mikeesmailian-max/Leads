# Mega Fleet Sales Prospecting & RC Intelligence Dashboard

A freight-specific sales prospecting and outreach tool for Mega Fleet Corp. Upload rate
confirmations, get shipper/broker/consignee/lane/contact intelligence automatically, draft
fact-based outreach, and run the whole pipeline from one dashboard.

This is not a generic CRM template — every module (uploads, accounts, contacts, lanes,
outreach, pipeline, tasks, analytics) is wired to a real PostgreSQL database and to each
other. Approving an uploaded rate confirmation actually creates accounts, facilities, a
lane, contacts, an opportunity, and follow-up tasks — you can see this end-to-end in the
seed data.

## Stack

- **Next.js 14** (App Router, Server Components + Server Actions)
- **TypeScript** throughout
- **Tailwind CSS**
- **PostgreSQL** + **Prisma ORM** (schema in `prisma/schema.prisma`)
- **NextAuth** (Credentials provider, JWT sessions) for simple internal auth
- **recharts** for the handful of charts that earn their place
- Zero required external/paid APIs in v1 — see "Where things plug in" below

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Point it at a PostgreSQL database

Copy `.env.example` to `.env` and fill in `DATABASE_URL`. This works with any standard
Postgres connection string — Manus AI's database, Supabase, RDS, Neon, or a local
Postgres instance:

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://user:password@host:5432/megafleet?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
UPLOADS_DIR="./uploads"
```

### 3. Create the schema and seed sample data

```bash
npm run db:migrate   # applies prisma/migrations, creates tables
npm run db:seed      # inserts a small, realistic dev dataset
```

The seed script (`prisma/seed.ts`) doesn't just insert rows — it runs two sample rate
confirmations through the **actual** intake pipeline (`approveParsedDocument`), so you get
real matched accounts, facilities, a repeat lane (Fresno → Phoenix, seen twice), contacts
with real confidence scores, and one generated outreach draft. It also creates two users:

| Email | Password | Role |
|---|---|---|
| `mikee@megafleetcorp.com` | `megafleet123` | Admin |
| `rep@megafleetcorp.com` | `megafleet123` | Rep |

**Change these passwords before using this anywhere real.**

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, log in, and you'll land on the Dashboard.

### Production build

```bash
npm run build
npm start
```

## How the data model fits together

`prisma/schema.prisma` is the source of truth. High level:

- **Document → DocumentParse**: every upload gets OCR'd (or read directly, for
  born-digital PDFs) and heuristically parsed into a `DocumentParse` draft. Nothing
  touches Accounts/Contacts/Lanes until a human clicks **Approve**.
- **Approving a parse** (`src/lib/intelligence/approveDocument.ts`) matches-or-creates the
  shipper/broker/consignee `Account`s, pickup/delivery `Facility`s, and a `Lane` (with
  frequency counting for repeat lanes), creates `Contact`s found on the document, and opens
  an `Opportunity` in the pipeline.
- **Accounts, Contacts, Lanes, Facilities** all carry `Note[]` and are cross-referenced in
  the shared `Activity` timeline (see `src/lib/activity/log.ts`).
- **OutreachDraft → OutreachMessage → EmailThread → Reply**: drafts are generated from
  facts pulled straight out of the database (`src/lib/outreach/facts.ts`) — never invented.
  Marking a draft "sent" creates the message/thread; pasting a reply back in classifies it
  and moves the pipeline stage.
- **Task** rows are created automatically by `src/lib/tasks/autoTasks.ts` at each of the key
  moments described in Settings → Auto-Task Rules, plus anything added manually.
- **StageHistory** gives you an audit trail of every pipeline stage change.

Soft deletes (`deletedAt`) are used on Account, Contact, Facility, Lane, Opportunity, Task,
Document, and OutreachDraft so nothing is destructively removed by day-to-day use.

## The freight intelligence engine (the actual point of this app)

- **Parser** — `src/lib/parser/`: dependency-free, regex/heuristic field extraction for
  rate confirmations (broker/shipper/consignee, pickup/delivery address+date, equipment,
  commodity, linehaul, reference/load/MC/DOT numbers, contacts/phones/emails found on the
  document). Confidence-scored per field; low-confidence documents are flagged for review.
- **Dedupe** — `src/lib/dedupe/`: normalizes company names, extracts domains, and does
  exact + domain + fuzzy (bigram similarity) matching so the same shipper doesn't get
  created twice from two different rate confirmations. The Accounts merge panel surfaces
  candidates the auto-matcher wasn't confident enough to merge automatically.
- **Contact scoring** — `src/lib/scoring/contactScoring.ts`: combines domain match, title
  relevance (against a freight-specific title list), presence on an actual uploaded
  document, name consistency, facility relevance, email pattern, and source reliability
  into one 0–100 score. Weights are tunable from Settings.
- **Outreach generator** — `src/lib/outreach/`: `facts.ts` pulls only what's actually in
  the database for an account/contact/lane; `templates.ts` turns those facts into eight
  outreach styles (cold intro, lane-specific, "similar freight," capacity/service,
  follow-up, wrong-contact reroute, quote response, re-engagement) in short and long
  versions. It's rule-based on purpose — it cannot fabricate volume, spend, or a
  relationship that isn't in the database.
- **Auto-tasks** — `src/lib/tasks/autoTasks.ts`: the rules described on the Settings page,
  e.g. approving a draft creates a send task, sending creates 2-day/5-day follow-ups, a
  reply cancels pending follow-ups, etc.

## Where things plug in (Phase 2)

The app is built so these are additive, not rewrites:

- **Real OCR** (`src/lib/ocr/extractText.ts`): v1 reads the embedded text layer of
  born-digital PDFs directly (no vendor needed) and flags scanned images for manual entry.
  To add Google Cloud Vision / AWS Textract / Azure Form Recognizer / an LLM vision API,
  implement the image branch in this one file — the return shape (`OcrResult`) and
  everything downstream (parser, review UI) stays the same.
- **Live email** (`src/lib/actions/outreach.ts` → `sendDraftAction`, and `src/app/(app)/replies`):
  v1 records "sent" and lets you paste replies in for classification. To wire up Gmail/
  Outlook/SMTP, replace the body of `sendDraftAction` with a real send call, and add a
  webhook or polling job that creates `Reply` rows automatically instead of via paste.
- **Contact enrichment / web research**: `src/lib/scoring/contactScoring.ts` already has a
  `source: "web"` case; add a research step that populates `Contact` rows with
  `source: "web"` before scoring.
- **Background job queue**: document processing currently fires-and-forgets
  (`processDocument(...).catch(...)`) from the upload API route, which is fine on a
  long-running Node server (`next start`) but not on serverless platforms with short
  request lifetimes. Swap in a real queue (BullMQ, a Postgres-backed job table, or your
  host's background functions) for production serverless deployments.

## Project structure

```
prisma/
  schema.prisma        # full data model
  migrations/           # generated SQL migrations
  seed.ts               # dev seed data (runs the real intake pipeline)
src/
  app/
    login/               # sign-in page
    (app)/               # authenticated app shell + all feature pages
      dashboard/
      uploads/[id]/
      accounts/[id]/
      contacts/[id]/
      lanes/[id]/
      outreach/new, [id]/
      pipeline/
      tasks/
      replies/
      analytics/
      settings/
    api/
      auth/[...nextauth]/
      documents/upload/
      search/
  components/            # ui/, layout/, dashboard/, uploads/, accounts/, contacts/,
                          # lanes/, outreach/, pipeline/, tasks/, replies/, settings/,
                          # notes/, timeline/, search/
  lib/
    parser/               # OCR text → structured fields
    ocr/                  # pluggable text extraction
    dedupe/                # company name normalization + fuzzy matching
    scoring/                # contact confidence engine
    intelligence/            # match-or-create + document approval orchestration
    outreach/                 # facts, templates, draft generator
    tasks/                    # auto-task rules
    replies/                   # reply category heuristics
    analytics/, dashboard/      # aggregate queries for the two reporting pages
    actions/                     # all server actions (mutations)
    auth.ts, session.ts, db.ts    # NextAuth config, session helpers, Prisma client
```

## Notes on decisions

- **No fabricated data in outreach.** The generator only uses facts already in the
  database. If you don't have a lane, contact title, or prior outreach history for an
  account, the copy simply doesn't reference it — it never invents volume or a
  relationship. See `src/lib/outreach/facts.ts` and `templates.ts`.
- **Heuristic parser, not a black box.** Because there's no OCR vendor key in v1, the
  parser is a transparent, regex-based rule set (`src/lib/parser/patterns.ts` +
  `rateConfirmationParser.ts`). It's intentionally modular so swapping in a real OCR/ML
  vendor later is a one-file change.
- **Server Actions over API routes** wherever the mutation doesn't need multipart/form-data
  handling (file upload is the one API route that needs it). Keeps the codebase smaller and
  more consistent with how Next.js 14 is meant to be used.
- **Soft deletes** everywhere records might be merged, archived, or corrected, so nothing
  in the pipeline is silently destroyed.
