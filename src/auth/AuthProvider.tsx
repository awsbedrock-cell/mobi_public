/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "../branding/types";
import {
  api,
  isLive,
  session,
  SIGNED_OUT_EVENT,
  type ApiError,
} from "../lib/api";
import { AuthScreen } from "./AuthScreen";

export interface Account {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthValue {
  /** The signed-in account. Always null in demo mode, where no login exists. */
  user: Account | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  signOut: () => undefined,
});

export const useAuth = () => useContext(AuthContext);

type Phase =
  | { step: "loading" }
  | { step: "unreachable" }
  | { step: "login" | "setup"; setupAvailable: boolean }
  | { step: "ready"; user: Account };

/** Live mode: nothing renders until someone is signed in. Demo mode: passes straight through. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return isLive ? <LiveAuth>{children}</LiveAuth> : <>{children}</>;
}

function LiveAuth({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ step: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const show = (next: Phase) => void (cancelled || setPhase(next));
    const askStatus = () =>
      api<{ setupRequired: boolean; setupAvailable: boolean }>(
        "/api/auth/status",
      ).then(
        (status) =>
          show({
            step: status.setupRequired ? "setup" : "login",
            setupAvailable: status.setupAvailable,
          }),
        () => show({ step: "unreachable" }),
      );
    if (!session.get()) void askStatus();
    else
      api<{ user: Account }>("/api/auth/me").then(
        ({ user }) => show({ step: "ready", user }),
        (error: ApiError) => {
          if (error.status !== 401) return show({ step: "unreachable" });
          session.clear();
          void askStatus();
        },
      );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setPhase({ step: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const signOut = useCallback(() => {
    session.clear();
    retry();
  }, [retry]);

  // The server rejected the session (expired, or the account was removed).
  useEffect(() => {
    window.addEventListener(SIGNED_OUT_EVENT, retry);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, retry);
  }, [retry]);

  const user = phase.step === "ready" ? phase.user : null;
  const value = useMemo(() => ({ user, signOut }), [user, signOut]);

  if (phase.step !== "ready") {
    return (
      <AuthScreen
        phase={phase}
        onRetry={retry}
        onSignedIn={(token, account) => {
          session.set(token);
          setPhase({ step: "ready", user: account });
        }}
      />
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
