import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { SenderProfileForm } from "@/components/settings/SenderProfileForm";
import { ScoringWeightsForm } from "@/components/settings/ScoringWeightsForm";
import { ScoringRecalibrationPanel } from "@/components/settings/ScoringRecalibrationPanel";
import { UserManager } from "@/components/settings/UserManager";
import { TagManager } from "@/components/settings/TagManager";
import { getSenderProfile } from "@/lib/outreach/facts";
import { getScoringWeights } from "@/lib/scoring/getWeights";
import { NEEDS_REVIEW_THRESHOLD } from "@/lib/parser/rateConfirmationParser";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { CheckCircle2, XCircle } from "lucide-react";

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
  const integrations = getIntegrationStatus();
  const INTEGRATION_ROWS: { label: string; configured: boolean; hint: string }[] = [
    { label: "OCR — AWS Textract (scanned/photographed docs)", configured: integrations.ocrTextract, hint: "OCR_PROVIDER, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY" },
    { label: "Email inbox ingestion (IMAP)", configured: integrations.emailInbox, hint: "IMAP_HOST, EMAIL_USER, EMAIL_PASSWORD" },
    { label: "Outreach sending (SMTP)", configured: integrations.emailSend, hint: "SMTP_HOST, EMAIL_USER, EMAIL_PASSWORD" },
    { label: "Contact enrichment — Apollo.io", configured: integrations.apolloEnrichment, hint: "APOLLO_API_KEY" },
    { label: "Slack daily digest", configured: integrations.slackAlerts, hint: "SLACK_WEBHOOK_URL" },
    { label: "SMS daily digest — Twilio", configured: integrations.smsAlerts, hint: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, ALERT_PHONE_NUMBER" },
    { label: "SMS-to-contact sending (multi-channel outreach)", configured: integrations.smsToContact, hint: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER" },
    { label: "Reply sentiment upgrade (LLM classification)", configured: integrations.llmSentiment, hint: "ANTHROPIC_API_KEY" },
    { label: "Cron routes protected", configured: integrations.cronProtected, hint: "CRON_SECRET" },
  ];

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
            <CardTitle>Win/Loss Scoring Recalibration</CardTitle>
          </CardHeader>
          <CardBody>
            <ScoringRecalibrationPanel />
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
              PDFs with an embedded text layer are read directly for free. Documents below <strong>{Math.round(NEEDS_REVIEW_THRESHOLD * 100)}%</strong> confidence
              are flagged for review. Scanned/photographed documents route through AWS Textract when configured below.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {INTEGRATION_ROWS.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    {row.configured ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                    <span className="font-medium">{row.label}</span>
                  </div>
                  <p className="ml-5.5 text-xs text-slate-400">{row.hint}</p>
                </div>
                <span className={row.configured ? "text-xs font-medium text-emerald-600" : "text-xs text-slate-400"}>
                  {row.configured ? "Configured" : "Not configured"}
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-400">
              Set these in your <code>.env</code> file — see <code>.env.example</code> and the README for setup instructions for each.
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
