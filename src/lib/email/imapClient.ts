import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getImapConfig } from "./config";
import { processDocument } from "@/lib/parser";
import { logActivity } from "@/lib/activity/log";
import { suggestReplyCategory } from "@/lib/replies/classify";
import { applyClassifiedReply } from "@/lib/replies/applyReply";

const ATTACHMENT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".heic"];

function guessDocumentType(filename: string): "RATE_CONFIRMATION" | "BOL" | "INVOICE" | "OTHER" {
  const lower = filename.toLowerCase();
  if (lower.includes("bol") || lower.includes("bill of lading")) return "BOL";
  if (lower.includes("invoice")) return "INVOICE";
  return "RATE_CONFIRMATION";
}

async function findSystemActorId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true }, orderBy: { createdAt: "asc" } });
  return admin?.id ?? null;
}

export interface PollInboxResult {
  ok: boolean;
  error?: string;
  notConfigured?: boolean;
  messagesSeen: number;
  documentsIngested: number;
  repliesIngested: number;
}

/**
 * Polls the configured mailbox (IMAP_HOST / EMAIL_USER / EMAIL_PASSWORD —
 * see .env.example) for unread mail and does two things with each message:
 *
 *  1. Attachments that look like rate confirmations (pdf/png/jpg/heic) are
 *     saved into UPLOADS_DIR and run through the existing upload+parse
 *     pipeline (`processDocument`), exactly as if they'd been dragged into
 *     the Uploads page by hand.
 *  2. If the sender's address matches a known Contact (or the domain
 *     matches a known Account), the message body is treated as a reply:
 *     classified with the same rule-based classifier used by the manual
 *     Replies page, and run through `applyClassifiedReply` so pipeline
 *     stage changes / auto-tasks fire automatically.
 *
 * Designed to be called from a scheduler (see
 * src/app/api/cron/poll-inbox/route.ts) rather than kept running — each
 * call opens a connection, processes what's new, and disconnects.
 */
export async function pollInbox(): Promise<PollInboxResult> {
  const config = getImapConfig();
  if (!config) {
    return { ok: true, notConfigured: true, error: "IMAP not configured (set IMAP_HOST / EMAIL_USER / EMAIL_PASSWORD in .env)", messagesSeen: 0, documentsIngested: 0, repliesIngested: 0 };
  }

  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    logger: false,
  });

  let messagesSeen = 0;
  let documentsIngested = 0;
  let repliesIngested = 0;
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  const systemActorId = await findSystemActorId();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      for (const uid of uids || []) {
        messagesSeen++;
        const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!message || !message.source) continue;

        const parsed = await simpleParser(message.source);
        const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() ?? null;
        const externalMessageId = parsed.messageId ?? null;
        const bodyText = (parsed.text ?? "").trim();

        // --- 1. Attachments → upload+parse pipeline ---
        for (const attachment of parsed.attachments ?? []) {
          const filename = attachment.filename || `inbox-attachment-${nanoid()}`;
          const ext = path.extname(filename).toLowerCase();
          if (!ATTACHMENT_EXTENSIONS.includes(ext)) continue;

          await fs.mkdir(uploadsDir, { recursive: true });
          const storedFilename = `${nanoid()}${ext}`;
          const storedPath = path.join(uploadsDir, storedFilename);
          await fs.writeFile(storedPath, attachment.content);

          const document = await prisma.document.create({
            data: {
              originalFilename: filename,
              storedPath,
              mimeType: attachment.contentType || null,
              fileSizeBytes: attachment.size || null,
              documentType: guessDocumentType(filename),
              status: "UPLOADED",
              uploadedById: systemActorId,
              needsReview: true,
            },
          });
          await logActivity({
            type: "INBOX_INGESTED",
            summary: `Rate confirmation auto-ingested from inbox: ${filename} (from ${fromAddress ?? "unknown sender"})`,
            documentId: document.id,
            actorId: systemActorId,
          });
          documentsIngested++;
          await processDocument(document.id).catch((err) => console.error("processDocument (inbox) error:", err));
        }

        // --- 2. Body text → reply classification, if we can match it to an account ---
        if (bodyText && fromAddress && externalMessageId) {
          const alreadyIngested = await prisma.reply.findUnique({ where: { externalMessageId } });
          if (!alreadyIngested) {
            const contact = await prisma.contact.findFirst({ where: { email: { equals: fromAddress, mode: "insensitive" }, deletedAt: null } });
            const domain = fromAddress.split("@")[1];
            const account =
              contact?.accountId
                ? await prisma.account.findUnique({ where: { id: contact.accountId } })
                : domain
                  ? await prisma.account.findFirst({ where: { domain: { equals: domain, mode: "insensitive" }, deletedAt: null } })
                  : null;

            if (account) {
              const category = suggestReplyCategory(bodyText);
              await applyClassifiedReply({
                accountId: account.id,
                contactId: contact?.id ?? null,
                rawText: bodyText,
                category,
                actorId: null,
                fromEmail: fromAddress,
                externalMessageId,
              });
              repliesIngested++;
            }
          }
        }

        await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err: any) {
    console.error("pollInbox failed:", err);
    return { ok: false, error: err?.message || "Unknown IMAP error", messagesSeen, documentsIngested, repliesIngested };
  }

  return { ok: true, messagesSeen, documentsIngested, repliesIngested };
}
