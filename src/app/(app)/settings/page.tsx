import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { SenderProfileForm } from "@/components/settings/SenderProfileForm";
import { ScoringWeightsForm } from "@/components/settings/ScoringWeightsForm";
import { UserManager } from "@/components/settings/UserManager";
import { TagManager } from "@/components/settings/TagManager";
import { getSenderProfile } from "@/lib/outreach/facts";
import { getScoringWeights } from "@/lib/scoring/getWeights";
import { NEEDS_REVIEW_THRESHOLD } from "@/lib/parser/rateConfirmationParser";

export const dynamic = "force-dynamic";

const TASK_RULES = [
  "Document uploaded with low parse confidence → \"Review parsed upload\" task",
  "New contact discovered with confidence < 85% → \"Verify contact\" task",
  "Outreach draft generated → \"Approve outreach draft\" task",
  "Draft approved → \"Send approved outreach\" task",
  "Outreach sent → \"Follow up (2 days)\" + \"Follow up (5 days)\" tasks",
  "Reply received → open follow-up tasks for that account/contact are cancelled",
  "Reply classified as wrong contact → \"Research better contact\" task",
  "Reply classified as interested/quote request → \"Call account\" task + stage moves to Interested/Quoting",
  "Opportunity moved to Archived → \"Confirm archive\" task",
];

const DOCUMENT_TYPES = [
  { type: "RATE_CONFIRMATION", desc: "Primary intake document — shipper/broker/consignee, lane, equipment, rate." },
  { type: "BOL", desc: "Bill of lading — supporting document, same parser pipeline." },
  { type: "INVOICE", desc: "Billing document — parsed for reference numbers and amounts." },
  { type: "CARRIER_PACKET", desc: "Onboarding packet — parsed for MC/DOT and contact info." },
  { type: "OTHER", desc: "Anything else — text still extracted and searchable." },
];

const PIPELINE_STAGES = ["NEW_FROM_UPLOAD", "RESEARCHING", "CONTACT_FOUND", "DRAFT_READY", "SENT", "REPLIED", "INTERESTED", "QUOTING", "CUSTOMER", "WON", "LOST", "ARCHIVED"];

export default async function SettingsPage() {
  const [senderProfile, scoringWeights, users, tags] = await Promise.all([
    getSenderProfile(),
    getScoringWeights(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Settings</h2>
        <p className="text-sm text-slate-500">Company profile, scoring, users, and how the system's automation rules work.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Profile &amp; Outreach Signature</CardTitle>
          </CardHeader>
          <CardBody>
            <SenderProfileForm initial={senderProfile} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Scoring Weights</CardTitle>
          </CardHeader>
          <CardBody>
            <ScoringWeightsForm initial={scoringWeights} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users &amp; Ownership</CardTitle>
          </CardHeader>
          <CardBody>
            <UserManager users={users} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardBody>
            <TagManager tags={tags} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OCR / Parser Settings</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p>
              v1 uses a dependency-free heuristic parser: PDFs with an embedded text layer are read directly; scanned images fall back to
              manual entry. Documents below <strong>{Math.round(NEEDS_REVIEW_THRESHOLD * 100)}%</strong> confidence are flagged for review.
            </p>
            <p className="text-xs text-slate-400">
              To wire up a real OCR vendor (Google Vision, AWS Textract, Azure Form Recognizer), set <code>OCR_PROVIDER</code> /{" "}
              <code>OCR_API_KEY</code> in your environment and implement the vendor call in <code>src/lib/ocr/extractText.ts</code> — see the README.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Type Definitions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {DOCUMENT_TYPES.map((d) => (
              <div key={d.type} className="text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{d.type.replaceAll("_", " ")}</span>
                <span className="ml-2 text-slate-400">{d.desc}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Pipeline Stages</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((s) => (
                <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {s.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-Task Rules</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-600 dark:text-slate-400">
              {TASK_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
