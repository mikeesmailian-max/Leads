"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Plus, UserX, UserCheck } from "lucide-react";
import { createUser, setUserActive } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function UserManager({ users }: { users: UserRow[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "REP">("REP");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createUser({ name, email, password, role });
      toast.success("User created");
      setName("");
      setEmail("");
      setPassword("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">{u.name}</p>
              <p className="text-xs text-slate-400">
                {u.email} · {u.role}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setUserActive(u.id, !u.isActive);
                  router.refresh();
                })
              }
            >
              {u.isActive ? (
                <>
                  <UserX className="h-3.5 w-3.5" /> Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" /> Activate
                </>
              )}
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <input required type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="REP">Rep</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" size="sm" disabled={pending} className="col-span-2">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add user
        </Button>
      </form>
    </div>
  );
}
