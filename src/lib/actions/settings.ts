"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { SenderProfile } from "@/lib/outreach/facts";
import type { ScoringWeights } from "@/lib/scoring/getWeights";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring/getWeights";
import { computeSuggestedWeights, applyRecalibration, type RecalibrationSuggestion } from "@/lib/scoring/recalibrate";

export async function updateSenderProfile(profile: SenderProfile) {
  await requireUser();
  await prisma.setting.upsert({
    where: { key: "outreach.senderProfile" },
    create: { key: "outreach.senderProfile", value: profile as any },
    update: { value: profile as any },
  });
  revalidatePath("/settings");
}

export async function updateScoringWeights(weights: ScoringWeights) {
  await requireUser();
  await prisma.setting.upsert({
    where: { key: "scoring.weights" },
    create: { key: "scoring.weights", value: weights as any },
    update: { value: weights as any },
  });
  revalidatePath("/settings");
}

export async function resetScoringWeights() {
  await requireUser();
  await prisma.setting.upsert({
    where: { key: "scoring.weights" },
    create: { key: "scoring.weights", value: DEFAULT_SCORING_WEIGHTS as any },
    update: { value: DEFAULT_SCORING_WEIGHTS as any },
  });
  revalidatePath("/settings");
}

export async function createUser(input: { name: string; email: string; password: string; role: "ADMIN" | "REP" }) {
  await requireUser();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email.toLowerCase().trim(), passwordHash, role: input.role },
  });
  revalidatePath("/settings");
  return user;
}

export async function setUserActive(id: string, isActive: boolean) {
  await requireUser();
  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/settings");
}

export async function createTag(name: string, color: string) {
  await requireUser();
  const tag = await prisma.tag.upsert({
    where: { name },
    create: { name, color },
    update: { color },
  });
  revalidatePath("/settings");
  return tag;
}

export async function deleteTag(id: string) {
  await requireUser();
  await prisma.accountTag.deleteMany({ where: { tagId: id } });
  await prisma.contactTag.deleteMany({ where: { tagId: id } });
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/settings");
}


export async function analyzeWinLossAction() {
  await requireUser();
  return computeSuggestedWeights();
}

export async function applyRecalibrationAction(suggestion: RecalibrationSuggestion) {
  const user = await requireUser();
  await applyRecalibration(suggestion, user.id);
  revalidatePath("/settings");
}
