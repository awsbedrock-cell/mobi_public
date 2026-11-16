import { useState, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { FormField } from "../components/ui/Field";
import { api } from "../lib/api";
import type { Account } from "./AuthProvider";

type Phase =
  | { step: "loading" }
  | { step: "unreachable" }
  | { step: "login" | "setup"; setupAvailable: boolean }
  | { step: "ready" };

interface Props {
  phase: Phase;
  onRetry: () => void;
  onSignedIn: (token: string, user: Account) => void;
}

export function AuthScreen({ phase, onRetry, onSignedIn }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    adminKey: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = phase.step === "setup";
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) =>
      setForm({ ...form, [key]: event.target.value }),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = setup
        ? await api<{ token: string; user: Account }>("/api/auth/setup", {
            body: {
              name: form.name,
              email: form.email,
              password: form.password,
            },
            headers: { "x-admin-key": form.adminKey.trim() },
          })
        : await api<{ token: string; user: Account }>("/api/auth/login", {
            body: { email: form.email, password: form.password },
          });
      onSignedIn(result.token, result.user);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4 text-text">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-primary-fg">
            M
          </span>
          <span className="text-lg font-extrabold">Mobi</span>
        </div>

        {phase.step === "loading" && (
          <p className="text-sm text-text-muted" role="status">
            Connecting to the Mobi server… The first load can take up to a
            minute.
          </p>
        )}

        {phase.step === "unreachable" && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Could not reach the Mobi server. Check your connection and try
              again.
            </p>
            <Button onClick={onRetry}>Try again</Button>
          </div>
        )}

        {(phase.step === "login" || phase.step === "setup") && (
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <h1 className="text-xl font-bold">
                {setup ? "Create the owner account" : "Sign in"}
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                {setup
                  ? "This shop has no accounts yet. The first account is the Store Owner, who can add staff later."
                  : "Use the email and password your Store Owner gave you."}
              </p>
            </div>
            {setup && !phase.setupAvailable && (
              <p className="text-sm font-medium text-error">
                ADMIN_KEY is not set on the Mobi server, so the owner account
                cannot be created yet.
              </p>
            )}
            {setup && (
              <FormField label="Your name">
                <input
                  className="field"
                  {...field("name")}
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </FormField>
            )}
            <FormField label="Email">
              <input
                className="field"
                type="email"
                {...field("email")}
                autoComplete="username"
                required
              />
            </FormField>
            <FormField label="Password">
              <input
                className="field"
                type="password"
                {...field("password")}
                autoComplete={setup ? "new-password" : "current-password"}
                required
                minLength={setup ? 8 : undefined}
              />
              {setup && (
                <span className="mt-1 block text-xs text-text-muted">
                  At least 8 characters.
                </span>
              )}
            </FormField>
            {setup && (
              <FormField label="Server admin key">
                <input
                  className="field"
                  type="password"
                  {...field("adminKey")}
                  autoComplete="off"
                  required
                />
                <span className="mt-1 block text-xs text-text-muted">
                  The ADMIN_KEY value from the Mobi server's environment. Needed
                  only this once.
                </span>
              </FormField>
            )}
            {error && (
              <p className="text-sm font-medium text-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Please wait…" : setup ? "Create account" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
