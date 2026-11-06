import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { Gamepad2, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CallProvider } from "@/components/mochat/CallProvider";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: Shell,
});

const TABS = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/status", label: "Status", icon: Sparkles },
  { to: "/states", label: "States", icon: MapPin },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/calls", label: "Calls", icon: Phone },
] as const;

function Shell() {
  const { pathname } = useLocation();
  const { profile } = useSession();
  const showNav = TABS.some((t) => pathname === t.to);

  return (
    <CallProvider>
      <div className="min-h-screen bg-soft md:py-6">
        <div className="relative mx-auto flex h-[100dvh] max-w-2xl flex-col overflow-hidden bg-background md:h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:shadow-pop">
          <div className="min-h-0 flex-1 overflow-hidden">
            {profile ? <Outlet /> : <div className="grid h-full place-items-center text-4xl animate-pulse">💬</div>}
          </div>
          {showNav && (
            <nav className="grid grid-cols-5 border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur">
              {TABS.map((t) => {
                const active = pathname === t.to;
                return (
                  <Link key={t.to} to={t.to} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold">
                    <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-all", active ? "bg-brand text-primary-foreground shadow-pop" : "text-muted-foreground")}>
                      <t.icon className="h-5 w-5" />
                    </span>
                    <span className={active ? "text-primary" : "text-muted-foreground"}>{t.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </CallProvider>
  );
}
