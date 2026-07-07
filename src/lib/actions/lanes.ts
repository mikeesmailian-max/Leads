"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateLaneAngle(laneId: string, suggestedAngle: string) {
  await requireUser();
  await prisma.lane.update({ where: { id: laneId }, data: { suggestedAngle } });
  revalidatePath(`/lanes/${laneId}`);
}
