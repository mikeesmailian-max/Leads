import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { IcpSourcingPanel } from "@/components/prospecting/IcpSourcingPanel";
import { BulkImportForm } from "@/components/prospecting/BulkImportForm";
import { getIcpProfile } from "@/lib/prospecting/icpSourcing";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { relativeTime } from "@/lib/utils";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  COMPETITOR_CUSTOMERS: "Competitor customers",
  DIRECTORY: "Directory / association",
  OTHER: "Other",
};

export default async function ProspectingPage() {
  const [icpProfile, integrations, batches, recentSourced] = await Promise.all([
    getIcpProfile(),
    Promise.resolve(getIntegrationStatus()),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.account.findMany({
      where: { source: { in: ["icp_sourcing", "lane_overlap"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Prospecting</h2>
        <p className="text-sm text-slate-500">Find new shippers instead of only working the ones that already came in the door.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ICP-Based Account Sourcing</CardTitle>
        </CardHeader>
        <CardBody>
          <IcpSourcingPanel initialProfile={icpProfile} apolloConfigured={integrations.apolloEnrichment} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import (Competitor Customers / Directories)</CardTitle>
        </CardHeader>
        <CardBody>
          <BulkImportForm />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Sourced Accounts</CardTitle>
          </CardHeader>
          <CardBody>
            {recentSourced.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing sourced yet — run ICP sourcing above or add a lane-overlap prospect from a lane page.</p>
            ) : (
              <ul className="space-y-2">
                {recentSourced.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {a.name}
                    </span>
                    <span className="text-xs text-slate-400">{a.source === "icp_sourcing" ? "ICP" : "Lane overlap"} · {relativeTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Batch History</CardTitle>
          </CardHeader>
          <CardBody>
            {batches.length === 0 ? (
              <p className="text-sm text-slate-400">No bulk imports yet.</p>
            ) : (
              <ul className="space-y-2">
                {batches.map((b) => (
                  <li key={b.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{b.label}</span>
                      <span className="text-xs text-slate-400">{relativeTime(b.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {SOURCE_LABELS[b.sourceType]} · {b.rowsCreated} created, {b.rowsSkipped} skipped of {b.rowsTotal}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
