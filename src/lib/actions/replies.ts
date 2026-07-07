"use server";

import { requireUser } from "@/lib/session";
import { applyClassifiedReply } from "@/lib/replies/applyReply";
import type { ReplyCategoryGuess } from "@/lib/replies/classify";
import { revalidatePath } from "next/cache";

export async function classifyReplyAction(input: {
  accountId: string;
  contactId?: string | null;
  rawText: string;
  category: ReplyCategoryGuess;
}) {
  const user = await requireUser();

  const reply = await applyClassifiedReply({
    accountId: input.accountId,
    contactId: input.contactId,
    rawText: input.rawText,
    category: input.category,
    actorId: user.id,
  });

  revalidatePath("/replies");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  revalidatePath(`/accounts/${input.accountId}`);
  return reply;
}
