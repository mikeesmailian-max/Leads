"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Plus, X } from "lucide-react";
import { createTag, deleteTag } from "@/lib/actions/settings";

interface TagRow {
  id: string;
  name: string;
  color: string;
}

const PALETTE = ["#64748b", "#3380fb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777"];

export function TagManager({ tags }: { tags: TagRow[] }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
            {t.name}
            <button
              onClick={() =>
                startTransition(async () => {
                  await deleteTag(t.id);
                  router.refresh();
                })
              }
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-sm text-slate-400">No tags yet.</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          startTransition(async () => {
            await createTag(name.trim(), color);
            setName("");
            toast.success("Tag added");
            router.refresh();
          });
        }}
        className="flex items-center gap-2"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <div className="flex gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button type="submit" disabled={pending} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
        </button>
      </form>
    </div>
  );
}
