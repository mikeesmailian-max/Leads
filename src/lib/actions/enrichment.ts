"use server";

import { requireUser } from "@/lib/session";
import { enrichAccountContacts } from "@/lib/enrichment/enrichAccount";
import { revalidatePath } from "next/cache";

export async function enrichAccountAction(accountId: string) {
  const user = await requireUser();
  const result = await enrichAccountContacts(accountId, user.id);
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/contacts");
  return result;
}
