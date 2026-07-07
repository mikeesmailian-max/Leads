import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ results: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [accounts, contacts, lanes, tasks, documents, notes] = await Promise.all([
    prisma.account.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }] },
      take: 5,
    }),
    prisma.contact.findMany({
      where: { deletedAt: null, OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
      take: 5,
      include: { account: true },
    }),
    prisma.lane.findMany({
      where: { deletedAt: null, OR: [{ label: { contains: q, mode: "insensitive" } }, { originCity: { contains: q, mode: "insensitive" } }, { destCity: { contains: q, mode: "insensitive" } }] },
      take: 5,
    }),
    prisma.task.findMany({
      where: { deletedAt: null, title: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.document.findMany({
      where: { deletedAt: null, originalFilename: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
    prisma.note.findMany({
      where: { body: { contains: q, mode: "insensitive" } },
      take: 5,
    }),
  ]);

  const results = [
    ...accounts.map((a) => ({ type: "account", id: a.id, title: a.name, subtitle: a.type, href: `/accounts/${a.id}` })),
    ...contacts.map((c) => ({ type: "contact", id: c.id, title: c.fullName, subtitle: c.account?.name, href: `/contacts/${c.id}` })),
    ...lanes.map((l) => ({ type: "lane", id: l.id, title: l.label, subtitle: l.equipmentType ?? undefined, href: `/lanes/${l.id}` })),
    ...tasks.map((t) => ({ type: "task", id: t.id, title: t.title, subtitle: t.status, href: `/tasks?highlight=${t.id}` })),
    ...documents.map((d) => ({ type: "document", id: d.id, title: d.originalFilename, subtitle: d.status, href: `/uploads/${d.id}` })),
    ...notes.map((n) => ({ type: "note", id: n.id, title: n.body.slice(0, 60), href: n.accountId ? `/accounts/${n.accountId}` : "/tasks" })),
  ];

  return NextResponse.json({ results });
}
