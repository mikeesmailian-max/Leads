/**
 * Minimal development seed data.
 *
 * Deliberately small — enough to exercise every module (dashboard, uploads,
 * accounts, contacts, lanes, outreach, pipeline, tasks, analytics) without
 * pretending to be real production data. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mega Fleet Sales Prospecting & RC Intelligence Dashboard...");

  // ---- Users ----------------------------------------------------------
  const passwordHash = await bcrypt.hash("megafleet123", 10);
  const mike = await prisma.user.upsert({
    where: { email: "mikee@megafleetcorp.com" },
    create: { name: "Mike", email: "mikee@megafleetcorp.com", passwordHash, role: "ADMIN" },
    update: {},
  });
  const rep = await prisma.user.upsert({
    where: { email: "rep@megafleetcorp.com" },
    create: { name: "Sam Rivera", email: "rep@megafleetcorp.com", passwordHash, role: "REP" },
    update: {},
  });

  // ---- Settings defaults ------------------------------------------------
  await prisma.setting.upsert({
    where: { key: "outreach.senderProfile" },
    create: {
      key: "outreach.senderProfile",
      value: {
        companyName: "Mega Fleet Corp",
        senderName: "Mike",
        senderTitle: "Mega Fleet Corp",
        signatureBlock: "Mike\nMega Fleet Corp\nmikee@megafleetcorp.com",
        regionalSpecialization: "western states",
        equipmentLanguage: "dry van and reefer",
        tone: "concise",
      },
    },
    update: {},
  });

  // ---- Tags --------------------------------------------------------------
  const tagHot = await prisma.tag.upsert({ where: { name: "Hot Lead" }, create: { name: "Hot Lead", color: "#dc2626" }, update: {} });
  const tagReefer = await prisma.tag.upsert({ where: { name: "Reefer" }, create: { name: "Reefer", color: "#0d9488" }, update: {} });

  // ---- Sample rate confirmation "documents" -------------------------------
  // We simulate two already-uploaded, already-parsed documents so the
  // intelligence pipeline (account/facility/lane/contact creation) runs for
  // real via approveParsedDocument, exactly as it would from the UI.
  const { approveParsedDocument } = await import("../src/lib/intelligence/approveDocument");

  const doc1 = await prisma.document.create({
    data: {
      originalFilename: "RC_10234_FreshFields.pdf",
      storedPath: path.resolve("./uploads/seed-sample-1.pdf"),
      mimeType: "application/pdf",
      documentType: "RATE_CONFIRMATION",
      status: "PARSED",
      ocrText: "Sample seed document — see DocumentParse for structured fields.",
      ocrConfidence: 1,
      needsReview: false,
      uploadedById: mike.id,
    },
  });
  await prisma.documentParse.create({
    data: {
      documentId: doc1.id,
      brokerName: "Summit Freight Solutions",
      shipperName: "Fresh Fields Produce Co",
      consigneeName: "Golden State Distribution",
      pickupAddress: "1200 Packing House Rd",
      pickupCity: "Fresno",
      pickupState: "CA",
      pickupZip: "93706",
      pickupDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      pickupTime: "07:00 AM",
      deliveryAddress: "480 Distribution Way",
      deliveryCity: "Phoenix",
      deliveryState: "AZ",
      deliveryZip: "85009",
      deliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      deliveryTime: "02:00 PM",
      commodity: "Produce",
      equipmentType: "REEFER",
      linehaulAmount: 1450.0,
      referenceNumber: "REF-10234",
      loadNumber: "LD-88213",
      mcNumber: "882134",
      extractedContacts: [
        { name: "Dana Whitfield", title: "Transportation Manager", phone: "(559) 555-0142", email: "dwhitfield@freshfieldsproduce.com" },
      ],
      extractedPhones: ["(559) 555-0142"],
      extractedEmails: ["dwhitfield@freshfieldsproduce.com"],
      confidenceScore: 0.91,
    },
  });
  const result1 = await approveParsedDocument(doc1.id, mike.id);

  const doc2 = await prisma.document.create({
    data: {
      originalFilename: "RC_10391_DesertHardware.pdf",
      storedPath: path.resolve("./uploads/seed-sample-2.pdf"),
      mimeType: "application/pdf",
      documentType: "RATE_CONFIRMATION",
      status: "PARSED",
      ocrText: "Sample seed document — see DocumentParse for structured fields.",
      ocrConfidence: 1,
      needsReview: false,
      uploadedById: rep.id,
    },
  });
  await prisma.documentParse.create({
    data: {
      documentId: doc2.id,
      brokerName: "Summit Freight Solutions",
      shipperName: "Desert Hardware Supply",
      consigneeName: "Bay Area Building Depot",
      pickupAddress: "88 Industrial Pkwy",
      pickupCity: "Phoenix",
      pickupState: "AZ",
      pickupZip: "85043",
      pickupDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      deliveryCity: "Oakland",
      deliveryState: "CA",
      deliveryZip: "94607",
      deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      commodity: "Building materials",
      equipmentType: "DRY_VAN",
      linehaulAmount: 1180.0,
      referenceNumber: "REF-10391",
      loadNumber: "LD-88579",
      mcNumber: "882134",
      extractedContacts: [{ name: "Marcus Lee", title: "Logistics Manager", phone: "(602) 555-0199", email: "mlee@deserthardwaresupply.com" }],
      extractedPhones: ["(602) 555-0199"],
      extractedEmails: ["mlee@deserthardwaresupply.com"],
      confidenceScore: 0.88,
    },
  });
  const result2 = await approveParsedDocument(doc2.id, rep.id);

  // Re-approve doc1's lane a second time via a repeat load to demonstrate
  // lane frequency counting (same origin/destination pair uploaded again).
  const doc3 = await prisma.document.create({
    data: {
      originalFilename: "RC_10502_FreshFields_Repeat.pdf",
      storedPath: path.resolve("./uploads/seed-sample-3.pdf"),
      mimeType: "application/pdf",
      documentType: "RATE_CONFIRMATION",
      status: "PARSED",
      ocrText: "Sample seed document — repeat lane.",
      ocrConfidence: 1,
      needsReview: false,
      uploadedById: mike.id,
    },
  });
  await prisma.documentParse.create({
    data: {
      documentId: doc3.id,
      brokerName: "Summit Freight Solutions",
      shipperName: "Fresh Fields Produce Co",
      consigneeName: "Golden State Distribution",
      pickupCity: "Fresno",
      pickupState: "CA",
      deliveryCity: "Phoenix",
      deliveryState: "AZ",
      commodity: "Produce",
      equipmentType: "REEFER",
      linehaulAmount: 1500.0,
      referenceNumber: "REF-10502",
      loadNumber: "LD-89011",
      confidenceScore: 0.6,
    },
  });
  await approveParsedDocument(doc3.id, mike.id);

  // ---- A manually added prospect (no document source) --------------------
  const prospect = await prisma.account.create({
    data: {
      name: "Cascade Timber & Lumber",
      normalizedName: "cascade timber lumber",
      website: "cascadetimber.com",
      domain: "cascadetimber.com",
      type: "PROSPECT",
      industry: "Building Materials",
      region: "Pacific Northwest",
      equipmentFocus: "FLATBED",
      source: "Manual entry",
      pipelineStage: "RESEARCHING",
      ownerId: mike.id,
    },
  });
  await prisma.accountTag.create({ data: { accountId: prospect.id, tagId: tagHot.id } });
  await prisma.activity.create({ data: { type: "CREATED", summary: "Account added manually as a target prospect", accountId: prospect.id, actorId: mike.id } });

  const prospectContact = await prisma.contact.create({
    data: {
      accountId: prospect.id,
      fullName: "Renee Ostrander",
      firstName: "Renee",
      lastName: "Ostrander",
      title: "Supply Chain Manager",
      email: "rostrander@cascadetimber.com",
      phone: "(503) 555-0110",
      confidenceScore: 0.72,
      status: "UNVERIFIED",
      verificationStatus: "PENDING",
      source: "manual",
      ownerId: mike.id,
    },
  });

  if (result1.shipperAccountId) {
    await prisma.accountTag.create({ data: { accountId: result1.shipperAccountId, tagId: tagReefer.id } }).catch(() => {});
  }

  // ---- Manual task not tied to auto-rules --------------------------------
  await prisma.task.create({
    data: {
      title: "Call Renee at Cascade Timber to introduce flatbed capacity",
      taskType: "CALL_ACCOUNT",
      priority: "HIGH",
      status: "OPEN",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      accountId: prospect.id,
      contactId: prospectContact.id,
      ownerId: mike.id,
    },
  });

  // ---- Example outreach draft via the real generator ----------------------
  if (result1.shipperAccountId) {
    const { generateDrafts } = await import("../src/lib/outreach/generator");
    await generateDrafts({
      accountId: result1.shipperAccountId,
      contactId: result1.contactIds[0] ?? null,
      laneId: result1.laneId ?? null,
      style: "LANE_SPECIFIC",
      createdById: mike.id,
    });
  }

  console.log("Seed complete.");
  console.log(`  Users: mikee@megafleetcorp.com / rep@megafleetcorp.com (password: megafleet123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
