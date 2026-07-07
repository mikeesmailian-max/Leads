import { prisma } from "@/lib/db";
import { matchOrCreateAccount, matchOrCreateFacility, matchOrCreateLane } from "./matchOrCreate";
import { scoreContact } from "@/lib/scoring/contactScoring";
import { getScoringWeights } from "@/lib/scoring/getWeights";
import { extractDomain } from "@/lib/dedupe/normalize";
import { logActivity } from "@/lib/activity/log";
import { onContactDiscovered } from "@/lib/tasks/autoTasks";

/**
 * The core "document → intelligence" pipeline.
 *
 * Called when a reviewer approves a DocumentParse (after correcting any
 * fields in the review UI). Turns the approved parse into:
 *  - matched/created shipper, broker, consignee Accounts
 *  - matched/created pickup + delivery Facilities
 *  - a matched/incremented Lane
 *  - Contact records for anyone found on the document
 *  - a new Opportunity in the pipeline (stage: NEW_FROM_UPLOAD)
 *  - activity log entries + review tasks for low-confidence contacts
 */
export async function approveParsedDocument(documentId: string, reviewedById?: string | null) {
  const parse = await prisma.documentParse.findUniqueOrThrow({ where: { documentId } });

  let shipperAccountId: string | null = null;
  let brokerAccountId: string | null = null;
  let consigneeAccountId: string | null = null;
  let primaryAccountId: string | null = null;

  if (parse.shipperName) {
    const { account, created } = await matchOrCreateAccount({
      rawName: parse.shipperName,
      type: "SHIPPER",
      sourceDocumentId: documentId,
    });
    shipperAccountId = account.id;
    primaryAccountId = account.id;
    await logActivity({
      type: created ? "ACCOUNT_MATCHED" : "UPDATED",
      summary: created ? `New shipper account discovered: ${account.name}` : `Matched existing account: ${account.name}`,
      accountId: account.id,
      documentId,
    });
  }

  if (parse.brokerName) {
    const { account } = await matchOrCreateAccount({
      rawName: parse.brokerName,
      type: "BROKER",
      sourceDocumentId: documentId,
    });
    brokerAccountId = account.id;
    primaryAccountId ??= account.id;
  }

  if (parse.consigneeName) {
    const { account } = await matchOrCreateAccount({
      rawName: parse.consigneeName,
      type: "CONSIGNEE",
      sourceDocumentId: documentId,
    });
    consigneeAccountId = account.id;
    primaryAccountId ??= account.id;
  }

  let pickupFacilityId: string | null = null;
  if (parse.pickupCity || parse.pickupAddress) {
    const { facility } = await matchOrCreateFacility({
      accountId: shipperAccountId,
      city: parse.pickupCity,
      state: parse.pickupState,
      zip: parse.pickupZip,
      address: parse.pickupAddress,
    });
    pickupFacilityId = facility.id;
  }

  let deliveryFacilityId: string | null = null;
  if (parse.deliveryCity || parse.deliveryAddress) {
    const { facility } = await matchOrCreateFacility({
      accountId: consigneeAccountId,
      city: parse.deliveryCity,
      state: parse.deliveryState,
      zip: parse.deliveryZip,
      address: parse.deliveryAddress,
    });
    deliveryFacilityId = facility.id;
  }

  let laneId: string | null = null;
  if (parse.pickupCity || parse.deliveryCity) {
    const { lane } = await matchOrCreateLane({
      originCity: parse.pickupCity,
      originState: parse.pickupState,
      destCity: parse.deliveryCity,
      destState: parse.deliveryState,
      equipmentType: parse.equipmentType,
      commodity: parse.commodity,
    });
    laneId = lane.id;
    if (shipperAccountId) {
      await prisma.laneAccount.upsert({
        where: { laneId_accountId: { laneId: lane.id, accountId: shipperAccountId } },
        create: { laneId: lane.id, accountId: shipperAccountId },
        update: {},
      });
    }
    if (pickupFacilityId) {
      await prisma.laneFacility.upsert({
        where: { laneId_facilityId: { laneId: lane.id, facilityId: pickupFacilityId } },
        create: { laneId: lane.id, facilityId: pickupFacilityId },
        update: {},
      });
    }
  }

  // Contacts found on the document
  const extracted = Array.isArray(parse.extractedContacts) ? (parse.extractedContacts as any[]) : [];
  const createdContactIds: string[] = [];
  const scoringWeights = await getScoringWeights();
  for (const c of extracted) {
    if (!c?.name && !c?.email) continue;
    const domain = extractDomain(shipperAccountId ? undefined : undefined) ?? extractDomain(c.email);
    const { confidence } = scoreContact({
      fullName: c.name,
      title: c.title,
      email: c.email,
      accountDomain: domain,
      source: "document",
      foundInDocument: true,
      facilityId: pickupFacilityId,
    }, scoringWeights);
    const contact = await prisma.contact.create({
      data: {
        accountId: shipperAccountId ?? primaryAccountId,
        facilityId: pickupFacilityId,
        fullName: c.name ?? c.email ?? "Unknown Contact",
        firstName: c.name?.split(" ")?.[0] ?? null,
        lastName: c.name?.split(" ")?.slice(1).join(" ") || null,
        title: c.title ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        confidenceScore: confidence,
        status: "NEW",
        source: "document",
        sourceDocumentId: documentId,
      },
    });
    createdContactIds.push(contact.id);
    await logActivity({
      type: "CONTACT_DISCOVERED",
      summary: `Contact discovered from document: ${contact.fullName}`,
      contactId: contact.id,
      accountId: contact.accountId,
      documentId,
    });
    await onContactDiscovered(contact.id, contact.accountId, confidence);
  }

  // Opportunity
  let opportunityId: string | null = null;
  if (primaryAccountId) {
    const opportunity = await prisma.opportunity.create({
      data: {
        accountId: primaryAccountId,
        laneId,
        contactId: createdContactIds[0] ?? null,
        stage: "NEW_FROM_UPLOAD",
        sourceDocumentId: documentId,
      },
    });
    opportunityId = opportunity.id;
    await prisma.stageHistory.create({
      data: { opportunityId: opportunity.id, toStage: "NEW_FROM_UPLOAD", changedById: reviewedById ?? null, note: "Created from approved upload" },
    });
  }

  await prisma.documentParse.update({
    where: { documentId },
    data: {
      isApproved: true,
      reviewedById: reviewedById ?? null,
      reviewedAt: new Date(),
      shipperAccountId,
      brokerAccountId,
      consigneeAccountId,
      pickupFacilityId,
      deliveryFacilityId,
      laneId,
    },
  });
  await prisma.document.update({ where: { id: documentId }, data: { status: "APPROVED", needsReview: false } });
  await logActivity({ type: "UPLOAD_PARSED", summary: "Document approved and converted to intelligence", documentId, accountId: primaryAccountId });

  return { shipperAccountId, brokerAccountId, consigneeAccountId, pickupFacilityId, deliveryFacilityId, laneId, opportunityId, contactIds: createdContactIds };
}
