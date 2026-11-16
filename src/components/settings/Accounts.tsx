import { KeyRound, Trash2, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Account } from "../../auth/AuthProvider";
import { roles, type Role } from "../../branding/types";
import { api } from "../../lib/api";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { FormField, Select } from "../ui/Field";
import { useToast } from "../ui/Toast";

export function AccountCard({ user }: { user: Account }) {
  const notify = useToast();
  const [form, setForm] = useState({ current: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/password", { body: form });
      setForm({ current: "", password: "" });
      notify("Password changed");
    } catch (error) {
      notify((error as Error).message, "error");
    }
    setBusy(false);
  };

  return (
    <Card className="self-start">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Your Account
          </span>
        }
        subtitle={`${user.name} · ${user.email} · ${user.role}`}
      />
      <form className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5" onSubmit={submit}>
        <FormField label="Current password">
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(event) =>
              setForm({ ...form, current: event.target.value })
            }
            required
          />
        </FormField>
        <FormField label="New password">
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            required
          />
        </FormField>
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" disabled={busy}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

const blank = { name: "", email: "", password: "", role: "Cashier" as Role };

export function TeamCard({ user }: { user: Account }) {
  const notify = useToast();
  const [team, setTeam] = useState<Account[] | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ users: Account[] }>("/api/users").then(
      (result) => void (cancelled || setTeam(result.users)),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      setTeam(
        (await api<{ users: Account[] }>("/api/users", { body: form })).users,
      );
      notify(`Account created for ${form.name}`);
      setForm(blank);
    } catch (error) {
      notify((error as Error).message, "error");
    }
    setBusy(false);
  };

  const remove = async (member: Account) => {
    if (
      !window.confirm(
        `Remove ${member.name}'s account? They will be signed out and cannot sign in again.`,
      )
    )
      return;
    try {
      setTeam(
        (
          await api<{ users: Account[] }>(`/api/users/${member.id}`, {
            method: "DELETE",
          })
        ).users,
      );
      notify(`${member.name} removed`, "info");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  return (
    <Card className="self-start">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Team
          </span>
        }
        subtitle="Staff who can sign in. Only a Store Owner can manage brands, marketplaces and accounts."
      />
      <ul className="divide-y divide-border px-4 pt-2 sm:px-5">
        {(team ?? [user]).map((member) => (
          <li key={member.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {member.name}
                {member.id === user.id && (
                  <span className="font-normal text-text-muted"> (you)</span>
                )}
              </p>
              <p className="truncate text-xs text-text-muted">{member.email}</p>
            </div>
            <Badge
              tone={member.role === "Store Owner" ? "primary" : "neutral"}
              dot={false}
            >
              {member.role}
            </Badge>
            {member.id !== user.id && (
              <IconButton
                label={`Remove ${member.name}`}
                tone="danger"
                onClick={() => void remove(member)}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            )}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 sm:p-5"
        onSubmit={add}
      >
        <FormField label="Name">
          <input
            className="field"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            maxLength={100}
          />
        </FormField>
        <FormField label="Email">
          <input
            className="field"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />
        </FormField>
        <FormField label="Temporary password">
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            required
          />
        </FormField>
        <FormField label="Role">
          <Select
            options={[...roles]}
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as Role })
            }
          />
        </FormField>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Add account
          </Button>
        </div>
      </form>
    </Card>
  );
}
