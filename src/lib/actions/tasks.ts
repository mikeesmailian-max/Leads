"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity/log";
import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskType, TaskStatus } from "@prisma/client";

export interface TaskInput {
  title: string;
  description?: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  dueDate?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  laneId?: string | null;
  opportunityId?: string | null;
  ownerId?: string | null;
}

export async function createManualTask(input: TaskInput) {
  const user = await requireUser();
  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description || null,
      taskType: input.taskType,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      accountId: input.accountId || null,
      contactId: input.contactId || null,
      laneId: input.laneId || null,
      opportunityId: input.opportunityId || null,
      ownerId: input.ownerId || user.id,
      status: "OPEN",
    },
  });
  await logActivity({ type: "TASK_CREATED", summary: task.title, accountId: task.accountId, contactId: task.contactId, actorId: user.id });
  revalidatePath("/tasks");
  return task;
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const user = await requireUser();
  const task = await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  if (status === "DONE") {
    await logActivity({ type: "TASK_COMPLETED", summary: task.title, accountId: task.accountId, contactId: task.contactId, actorId: user.id });
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return task;
}

export async function deleteTask(id: string) {
  await requireUser();
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date(), status: "CANCELLED" } });
  revalidatePath("/tasks");
}
