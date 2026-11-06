import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCheck, MessageSquarePlus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, Fab } from "@/components/mochat/TopBar";
import { Avatar } from "@/components/mochat/Avatar";
import { ContactPicker } from "@/components/mochat/ContactPicker";
import { useChatList } from "@/hooks/use-chats";
import { useMe } from "@/hooks/use-session";
import { fmtTime, isOnline, previewText } from "@/lib/mochat";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({ meta: [{ title: "Chats · MoChat" }, { name: "description", content: "Your MoChat conversations." }] }),
  component: ChatsPage,
});

function ChatsPage() {
  const { uid } = useMe();
  const { data = [], isLoading } = useChatList(uid);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [picker, setPicker] = useState(false);
  const navigate = useNavigate();

  const list = data.filter(
    (c) => (c.other?.name ?? "").toLowerCase().includes(q.toLowerCase()) && (filter === "all" || c.unread > 0),
  );

  const startChat = async (otherId: string) => {
    const { data: id, error } = await supabase.rpc("start_direct", { _other: otherId });
    if (error || !id) return toast.error("Couldn't start chat");
    setPicker(false);
    navigate({ to: "/chat/$id", params: { id } });
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar title="MoChat" />
      <div className="space-y-3 bg-background px-4 pt-3">
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent outline-none" />
        </div>
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize transition ${filter === f ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-28 pt-2">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="mx-4 my-2 h-16 animate-pulse rounded-2xl bg-muted" />)}
        {list.map((c, i) => (
          <Link
            key={c.conv.id}
            to="/chat/$id"
            params={{ id: c.conv.id }}
            className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/60 animate-pop"
            style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
          >
            <Avatar src={c.other?.avatar_url} name={c.other?.name} size={54} online={isOnline(c.other)} />
            <div className="min-w-0 flex-1 border-b border-border/60 pb-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-bold">{c.other?.name ?? "MoChat user"}</p>
                <span className={`shrink-0 text-xs ${c.unread ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {c.last ? fmtTime(c.last.created_at) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground">
                  {c.last?.sender_id === uid && <CheckCheck className="h-4 w-4 shrink-0 text-violet" />}
                  <span className="truncate">{previewText(c.last) || "Say hi 👋🏾"}</span>
                </p>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {!isLoading && list.length === 0 && <p className="py-16 text-center text-muted-foreground">No chats here yet 💭</p>}
      </div>
      <Fab onClick={() => setPicker(true)} label="New chat">
        <MessageSquarePlus />
      </Fab>
      <ContactPicker open={picker} onOpenChange={setPicker} title="New chat" onPick={(p) => startChat(p.id)} />
    </div>
  );
}
