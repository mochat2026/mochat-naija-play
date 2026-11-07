import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/mochat/TopBar";
import { useMe } from "@/hooks/use-session";
import { STATES, isOnline, stateColors } from "@/lib/mochat";

export const Route = createFileRoute("/_authenticated/states")({
  head: () => ({ meta: [{ title: "State Groups · MoChat" }, { name: "description", content: "Meet and chat with people from all 36 Nigerian states and FCT." }] }),
  component: StatesPage,
});

function StatesPage() {
  const { uid, me } = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["state-stats", uid],
    queryFn: async () => {
      const { data: convs } = await supabase.from("conversations").select("id,state_code").eq("type", "state");
      const { data: mem } = await supabase.from("conversation_members").select("conversation_id,user_id,profiles(last_seen),conversations!inner(type)").eq("conversations.type", "state");
      const stats: Record<string, { members: number; active: number; joined: boolean }> = {};
      for (const c of convs ?? []) {
        const ms = (mem ?? []).filter((m) => m.conversation_id === c.id);
        stats[c.state_code!] = {
          members: ms.length,
          active: ms.filter((m) => isOnline(m.profiles as { last_seen: string })).length,
          joined: ms.some((m) => m.user_id === uid),
        };
      }
      return stats;
    },
  });

  const open = async (code: string) => {
    const { data: id, error } = await supabase.rpc("join_state", { _code: code });
    if (error || !id) return toast.error("Couldn't open group");
    navigate({ to: "/chat/$id", params: { id } });
  };

  const myState = STATES.find((s) => s.code === me?.state);
  const list = STATES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.capital.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <TopBar title="States 🇳🇬" />
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {myState && (() => {
          const [a, b] = stateColors(myState.code);
          const st = data?.[myState.code];
          return (
            <button onClick={() => open(myState.code)} className="relative mb-4 w-full overflow-hidden rounded-3xl p-5 text-left text-primary-foreground shadow-pop" style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}>
              <span className="absolute -right-4 -top-6 font-display text-[7rem] font-bold opacity-15">{myState.code}</span>
              <p className="text-xs font-extrabold uppercase tracking-wider opacity-90">Your state group</p>
              <p className="mt-1 font-display text-3xl font-bold">{myState.name}</p>
              <p className="mt-2 flex items-center gap-3 text-sm font-semibold">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {st?.members ?? "–"} members</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary-foreground" /> {st?.active ?? 0} active</span>
              </p>
              <span className="mt-3 inline-block rounded-full bg-primary-foreground px-4 py-1.5 text-sm font-bold text-foreground">Open chat →</span>
            </button>
          );
        })()}
        <div className="mb-3 flex items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 36 states + FCT" className="flex-1 bg-transparent outline-none" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {list.map((s) => {
            const [a, b] = stateColors(s.code);
            const st = data?.[s.code];
            return (
              <button key={s.code} onClick={() => open(s.code)} className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm transition hover:shadow-pop">
                <div className="flex h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
                  <span className="flex-1" style={{ background: a }} />
                  <span className="grid flex-1 place-items-center bg-card text-[10px] font-extrabold">{s.code}</span>
                  <span className="flex-1" style={{ background: b }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{st?.members ?? 0} members · {st?.active ?? 0} active{st?.joined ? " · Joined" : ""}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
