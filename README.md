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

## Optional integrations (all off by default, enable via `.env`)

Every integration below degrades gracefully when unconfigured — the app runs exactly like
v1 with none of these set. The Settings page has a live "Integrations" status card showing
which of these are currently configured, so you don't have to go check `.env` by hand.

### 1. Real OCR for scanned/photographed rate cons — AWS Textract

`src/lib/ocr/extractText.ts` reads the embedded text layer of born-digital PDFs directly
for free. When `OCR_PROVIDER="aws-textract"` plus AWS credentials are set, images and
scanned PDFs with no text layer route through Textract instead of being flagged for manual
entry. Set in `.env`:

```
OCR_PROVIDER="aws-textract"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

To swap in a different vendor (Google Document AI, Azure Form Recognizer, an LLM vision
API), add a sibling file under `src/lib/ocr/providers/` returning the same `OcrResult`
shape and branch on `OCR_PROVIDER` in `extractText.ts` — nothing downstream changes.

### 2. Email inbox ingestion — auto-pull rate cons and replies (IMAP)

`src/lib/email/imapClient.ts` polls a mailbox for unread mail. PDF/image attachments are
run through the same upload+parse pipeline as a manual drag-and-drop; message bodies from
senders that match a known contact/account are classified and logged as `Reply` rows
automatically (same rules as the manual Replies page). Works with a Gmail "app password"
or any IMAP provider, including Office 365:

```
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"
EMAIL_USER="you@megafleetcorp.com"
EMAIL_PASSWORD="your-app-password"
```

Trigger it on a schedule by calling `GET /api/cron/poll-inbox` with a `CRON_SECRET` bearer
token (every 5-15 minutes is reasonable) — see "Scheduling the cron routes" below.

### 3. One-click outreach sending — SMTP

`sendDraftAction` (`src/lib/actions/outreach.ts`) sends the approved draft for real over
SMTP when configured, instead of just logging it as sent for manual copy/paste. If the
send actually fails (bad credentials, etc.) the message is marked `FAILED` rather than
silently claiming success. Reuses the same `EMAIL_USER`/`EMAIL_PASSWORD` as IMAP above:

```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
EMAIL_FROM_NAME="Mike @ Mega Fleet Corp"
EMAIL_FROM_ADDRESS="you@megafleetcorp.com"
```

### 4. Contact enrichment + shipping/logistics decision-maker detection — Apollo.io

Click "Find Contacts" on any account's detail page to search Apollo.io for additional
people at that company. `src/lib/enrichment/decisionMaker.ts` scores every result on
seniority (VP/Director/Manager/Coordinator) and role relevance (logistics, shipping,
supply chain, transportation, procurement, distribution, fleet, traffic, warehouse), and
flags the single best match as the account's decision-maker (`Contact.isDecisionMaker`,
shown as a green badge in the Contacts list and on the account page) — so it's obvious at
a glance who to actually call instead of a flat list of names. This is a manual, explicit
action per account (not automatic on every upload) so it doesn't silently spend Apollo
credits. Get a key at https://developer.apollo.io/:

```
APOLLO_API_KEY="..."
```

### 5. Proactive daily digest — Slack and/or SMS

Instead of having to open the dashboard to see what needs attention, `src/lib/alerts/dailyDigest.ts`
composes a summary (follow-ups due, replies waiting, drafts ready to send, hot
Interested/Quoting accounts) and posts it to a Slack channel and/or texts it via Twilio.
Either, both, or neither can be configured:

```
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+15551234567"
ALERT_PHONE_NUMBER="+15557654321"
```

Trigger it on a schedule by calling `GET /api/cron/daily-digest` (once a day, e.g. weekday
mornings) — see below.

### Scheduling the cron routes

`/api/cron/poll-inbox` and `/api/cron/daily-digest` are protected by a bearer-token check
(`src/lib/cron/auth.ts`), not a login session, since they're meant to be called by a
scheduler with nobody logged in. Set a random secret and call them with it:

```
CRON_SECRET="replace-with-openssl-rand-hex-32"
```

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/poll-inbox
curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/daily-digest
curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/icp-sourcing
curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/hiring-signals
curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/stale-deals
```

Any scheduler works — Vercel Cron (`vercel.json`), an OS crontab running `curl`, GitHub
Actions on a schedule, etc. Without `CRON_SECRET` set, all routes reject every request
(fails closed, not open).

## The shipper-prospecting machine (outbound sourcing + inbound tightening)

On top of the core rate-con → outreach → close workflow above, the app also actively
finds new shippers to prospect and tightens the existing pipeline so nothing sits idle.
Five features work outbound (finding new accounts); five work inbound (getting more out
of accounts you already have). All ten are real, working logic — not mockups — and every
one degrades gracefully (returns a clear "not configured" result, never throws) when its
optional integration isn't set up.

### Outbound: finding new shippers

**1. ICP-based account sourcing.** Define your ideal customer profile (industries,
locations, employee count range) on the `/prospecting` page, then click "Run sourcing
now" to pull matching companies from Apollo's organization search
(`src/lib/prospecting/icpSourcing.ts`). New matches are deduped against your existing
accounts and created as fresh prospects at the `RESEARCHING` stage. Requires
`APOLLO_API_KEY`. Can also run on a schedule via `/api/cron/icp-sourcing`.

**2. Hiring-signal detection.** On any account page, click "Check hiring signal" to pull
that company's recent job postings from Apollo and flag whether they're hiring for
logistics/warehouse/supply-chain roles (`src/lib/prospecting/hiringSignals.ts`) — a
practical proxy for "this company is growing and may need more freight capacity soon."
Requires `APOLLO_API_KEY` and the account to have been sourced via Apollo (has an
`apolloOrgId`). Can run in bulk on a schedule via `/api/cron/hiring-signals`.

**3. Lane-overlap prospecting.** On any lane's detail page, click "Find prospects on
this lane" to search Apollo for companies located in that lane's origin/destination
cities — the idea being that shippers near a lane you already run are cheap
incremental freight (`src/lib/prospecting/laneOverlap.ts`). One click adds any candidate
as a new prospect linked to that lane.

**4. Competitor customer bulk-import** and **5. Directory/association bulk-import.**
*Honest scope note:* there is no reliable, ToS-compliant API for scraping a competitor's
customer list or an association's member directory — so instead of faking that with
brittle scraping, `/prospecting` has a bulk-import tool
(`src/lib/prospecting/bulkImport.ts`): paste or type a list of company names (optionally
with domain/city/state), tag it as "Competitor customers" or "Directory," and it dedupes
against your CRM and creates the new ones as prospects. Same tool, two source labels —
use it with whatever list you already have (a competitor's website customer logos, a
trade association's public member list, a conference exhibitor list, etc.).

### Inbound: getting more out of the pipeline you already have

**6. Stale-deal auto-escalation.** Any account sitting in `RESEARCHING` or
`CONTACT_FOUND` with no activity for 7+ days automatically gets a follow-up task created
(priority scales with how stale it is), so leads don't quietly die from neglect
(`src/lib/tasks/staleDeals.ts`). The dashboard's "Stale deals" work-queue card shows the
current count. Runs automatically as replies/activity come in, and can also be swept in
bulk via `/api/cron/stale-deals`.

**7. Reply sentiment auto-triage.** Every inbound reply is tagged Hot/Warm/Neutral/Cold
based on its category (interested/quote-request → Hot, not-interested/unsubscribe →
Cold, etc.), and the `/replies` inbox is sorted hottest-first so you always work the
most promising replies first (`src/lib/replies/sentiment.ts`). If the fast heuristic
can't categorize a reply, it optionally falls back to an LLM classification call
(requires `ANTHROPIC_API_KEY`) — otherwise it's simply left as Neutral, never guessed
at silently.

**8. Win/loss scoring feedback loop.** On the Settings page, "Analyze win/loss patterns"
looks at your closed-won vs. closed-lost opportunities and computes which confidence-score
factors actually correlated with winning (`src/lib/scoring/recalibrate.ts`). It shows you
the suggested weight changes and why — you decide whether to apply them. Requires at
least 3 won and 3 lost deals with a linked contact; otherwise it tells you plainly that
there isn't enough closed data yet, rather than guessing.

**9. Multi-channel outreach.** Drafts can now be sent by SMS (a real send via Twilio,
requires `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` and the contact
having a phone number) in addition to email. LinkedIn is offered too, but — since there's
no legitimate API for sending LinkedIn messages on your behalf — it's draft-only: the
message is copied to your clipboard for you to paste and send manually, then you confirm
it was sent.

**10. Instant quote-on-interest.** When a reply comes in tagged Interested or
Quote Request, the app automatically drafts a quote response — and if there's enough
recent rate-confirmation history on that lane (2+ prior loads), it fills in a real
suggested linehaul number instead of generic language
(`src/lib/outreach/rateQuote.ts`). Never fabricates a number: below the 2-load threshold,
it falls back to the original non-numeric template.

### Still a known limitation (not addressed by the above)

Document processing (both manual upload and inbox-ingested attachments) still fires and
forgets a background promise from within the request handler
(`processDocument(...).catch(...)`). That's fine on a long-running Node server (`next
start`), but not reliable on serverless platforms with short request lifetimes. For a
serverless deployment, swap this for a real queue (BullMQ, a Postgres-backed job table, or
your host's background functions).

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
