import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/mochat";

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  dark: boolean;
  setDark: (v: boolean) => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("mochat-dark") === "1";
    setDarkState(d);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const setDark = (v: boolean) => {
    localStorage.setItem("mochat-dark", v ? "1" : "0");
    setDarkState(v);
  };

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") return;
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => loadProfile(session.user.id).finally(() => setLoading(false)), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // presence heartbeat
  useEffect(() => {
    if (!user) return;
    const beat = () => supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <SessionContext.Provider value={{ user, profile, loading, refreshProfile, dark, setDark }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession outside provider");
  return c;
}

/** For authenticated pages: profile is guaranteed after the gate. */
export function useMe() {
  const { user, profile } = useSession();
  return { me: profile, uid: user?.id ?? "" };
}
