import { prisma } from "@/lib/db";
import { findAccountMatches, normalizeCompanyName, extractDomain } from "@/lib/dedupe/accountDedupe";
import { logActivity } from "@/lib/activity/log";
import type { ImportSourceType } from "@prisma/client";

export interface ParsedImportRow {
  name: string;
  domain: string | null;
  city: string | null;
  state: string | null;
}

/**
 * Parses pasted/CSV text into candidate account rows. Deliberately generic
 * (name, domain, city, state) rather than tied to one specific directory
 * format — there's no single reliable API for "list every company in a
 * chamber of commerce directory" or "list every customer on a competitor's
 * case-studies page," so this is the honest, maintainable version of
 * recommendations #4 and #5: paste in whatever list you found (competitor
 * customer logos, an association directory export, a trade-show attendee
 * list, etc.) and bulk-import it as prospects, instead of promising a
 * live scraper that would be too fragile to trust.
 *
 * Accepted line formats (comma or tab separated), one company per line:
 *   Company Name
 *   Company Name, domain.com
 *   Company Name, domain.com, City, ST
 */
export function parseBulkImportText(text: string): ParsedImportRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ParsedImportRow[] = [];
  for (const line of lines) {
    const parts = line.split(/[,\t]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const name = parts[0];
    if (!name) continue;
    const second = parts[1];
    const domain = second ? extractDomain(second) : null;
    rows.push({
      name,
      domain,
      city: parts[2] ?? null,
      state: parts[3] ?? null,
    });
  }
  return rows;
}

export interface BulkImportResult {
  ok: boolean;
  error?: string;
  batchId: string | null;
  rowsTotal: number;
  rowsCreated: number;
  rowsSkipped: number;
}

/** Bulk-creates prospect Accounts from a parsed list, deduping against existing accounts. */
export async function importBulkAccounts(input: {
  label: string;
  sourceType: ImportSourceType;
  rows: ParsedImportRow[];
  actorId: string | null;
}): Promise<BulkImportResult> {
  if (input.rows.length === 0) {
    return { ok: false, error: "No rows to import", batchId: null, rowsTotal: 0, rowsCreated: 0, rowsSkipped: 0 };
  }

  const batch = await prisma.importBatch.create({
    data: {
      label: input.label,
      sourceType: input.sourceType,
      importedById: input.actorId,
      rowsTotal: input.rows.length,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const row of input.rows) {
    const matches = await findAccountMatches(row.name, row.domain);
    if (matches.length > 0) {
      skipped++;
      continue;
    }

    await prisma.account.create({
      data: {
        name: row.name,
        normalizedName: normalizeCompanyName(row.name),
        domain: row.domain,
        region: [row.city, row.state].filter(Boolean).join(", ") || null,
        type: "PROSPECT",
        source: `bulk_import:${input.sourceType.toLowerCase()}`,
        pipelineStage: "NEW_FROM_UPLOAD",
        importBatchId: batch.id,
      },
    });
    created++;
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rowsCreated: created, rowsSkipped: skipped },
  });

  await logActivity({
    type: "BULK_IMPORTED",
    summary: `Bulk import "${input.label}" — ${created} created, ${skipped} skipped (already existed)`,
    actorId: input.actorId,
  });

  return { ok: true, batchId: batch.id, rowsTotal: input.rows.length, rowsCreated: created, rowsSkipped: skipped };
}
