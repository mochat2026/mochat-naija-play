import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Phone, PhoneCall, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, Fab } from "@/components/mochat/TopBar";
import { Avatar } from "@/components/mochat/Avatar";
import { ContactPicker } from "@/components/mochat/ContactPicker";
import { useCall } from "@/components/mochat/CallProvider";
import { useMe } from "@/hooks/use-session";
import { fmtDuration, fmtTime, type Profile } from "@/lib/mochat";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({ meta: [{ title: "Calls · MoChat" }, { name: "description", content: "Your voice and video call history." }] }),
  component: CallsPage,
});

function CallsPage() {
  const { uid } = useMe();
  const { startCall } = useCall();
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const { data = [] } = useQuery({
    queryKey: ["calls", uid],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("calls")
        .select("*, caller:profiles!calls_caller_id_fkey(*), callee:profiles!calls_callee_id_fkey(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const list = data.filter((c) => filter === "all" || c.status === "missed");

  return (
    <div className="relative flex h-full flex-col">
      <TopBar title="Calls" />
      <div className="flex gap-2 px-4 pt-3">
        {(["all", "missed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${filter === f ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pb-28 pt-2">
        {list.map((c) => {
          const outgoing = c.caller_id === uid;
          const peer = (outgoing ? c.callee : c.caller) as unknown as Profile;
          const missed = c.status === "missed";
          const Dir = outgoing ? ArrowUpRight : ArrowDownLeft;
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 animate-pop">
              <Avatar src={peer?.avatar_url} name={peer?.name} size={50} />
              <div className="min-w-0 flex-1">
                <p className={cn("font-bold", missed && !outgoing && "text-destructive")}>{peer?.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Dir className={cn("h-4 w-4", missed ? "text-destructive" : "text-success")} />
                  {missed ? (outgoing ? "No answer" : "Missed") : outgoing ? "Outgoing" : "Incoming"} · {fmtTime(c.created_at)}
                  {c.duration > 0 && ` · ${fmtDuration(c.duration)}`}
                </p>
              </div>
              <button onClick={() => peer && startCall(peer, c.kind as "voice" | "video")} className="grid h-11 w-11 place-items-center rounded-full text-primary hover:bg-secondary" aria-label="Call back">
                {c.kind === "video" ? <Video /> : <Phone />}
              </button>
            </div>
          );
        })}
        {list.length === 0 && <p className="py-16 text-center text-muted-foreground">No calls yet 📞</p>}
      </div>
      <Fab onClick={() => setPicker(true)} label="New call"><PhoneCall /></Fab>
      <ContactPicker
        open={picker}
        onOpenChange={setPicker}
        title="New call"
        onPick={(p) => { setPicker(false); startCall(p, "voice"); }}
        action={(p) => (
          <div className="flex gap-1">
            <button onClick={() => { setPicker(false); startCall(p, "voice"); }} className="grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-secondary" aria-label="Voice call"><Phone className="h-4 w-4" /></button>
            <button onClick={() => { setPicker(false); startCall(p, "video"); }} className="grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-secondary" aria-label="Video call"><Video className="h-4 w-4" /></button>
          </div>
        )}
      />
    </div>
  );
}
