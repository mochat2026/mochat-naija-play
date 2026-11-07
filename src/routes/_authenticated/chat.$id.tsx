import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Phone, Star, Video, Palette, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/mochat/Avatar";
import { MessageBubble } from "@/components/mochat/MessageBubble";
import { Composer, type OutMsg } from "@/components/mochat/Composer";
import { WallpaperGrid } from "@/components/mochat/WallpaperGrid";
import { useCall } from "@/components/mochat/CallProvider";
import { useMe, useSession } from "@/hooks/use-session";
import { useChatList } from "@/hooks/use-chats";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WALLPAPERS, isOnline, lastSeenText, previewText, stateColors, uploadMedia, type Message, type Profile } from "@/lib/mochat";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Chat · MoChat" }, { name: "description", content: "MoChat conversation." }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const { uid, me } = useMe();
  const { refreshProfile } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { startCall } = useCall();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [wallOpen, setWallOpen] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: info } = useQuery({
    queryKey: ["conv", id],
    queryFn: async () => {
      const [{ data: conv }, { data: members }] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", id).maybeSingle(),
        supabase.from("conversation_members").select("user_id,profiles(*)").eq("conversation_id", id),
      ]);
      const profiles = (members ?? []).map((m) => m.profiles as unknown as Profile).filter(Boolean);
      return { conv, profiles };
    },
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(500);
      return data ?? [];
    },
  });
  const { data: stars = [] } = useQuery({
    queryKey: ["stars", uid],
    queryFn: async () => (await supabase.from("message_stars").select("message_id").eq("user_id", uid)).data?.map((s) => s.message_id) ?? [],
  });
  const { data: chats = [] } = useChatList(uid);

  const isGroup = info?.conv?.type === "state";
  const other = info?.profiles.find((p) => p.id !== uid);
  const byId = useMemo(() => new Map(info?.profiles.map((p) => [p.id, p])), [info]);
  const msgById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => {
        if (p.eventType === "INSERT") setTyping(false);
        qc.invalidateQueries({ queryKey: ["messages", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", uid).then(() => {
      qc.invalidateQueries({ queryKey: ["chats", uid] });
    });
  }, [messages.length, id, uid, qc, typing]);

  const send = async (o: OutMsg, convId = id) => {
    try {
      let media_url: string | null = null;
      if (o.file) {
        const t = toast.loading("Sending…");
        media_url = await uploadMedia(uid, o.file, o.fileName);
        toast.dismiss(t);
      }
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId, sender_id: uid, kind: o.kind, body: o.body ?? null, media_url, meta: (o.meta ?? {}) as never,
        reply_to: convId === id ? replyTo?.id ?? null : null,
      });
      if (error) throw error;
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["messages", id] });
      if (!isGroup && other?.is_demo && convId === id) {
        setTimeout(() => setTyping(true), 800);
        setTimeout(() => supabase.rpc("demo_reply", { _conv: id }), 2500);
      }
    } catch (e) {
      toast.error("Message failed to send");
      console.error(e);
    }
  };

  const toggleStar = async (m: Message) => {
    if (stars.includes(m.id)) await supabase.from("message_stars").delete().eq("user_id", uid).eq("message_id", m.id);
    else await supabase.from("message_stars").insert({ user_id: uid, message_id: m.id });
    qc.invalidateQueries({ queryKey: ["stars", uid] });
  };
  const del = async (m: Message) => {
    await supabase.from("messages").update({ deleted: true }).eq("id", m.id);
    qc.invalidateQueries({ queryKey: ["messages", id] });
  };
  const forwardTo = async (convId: string) => {
    if (!forwarding) return;
    const f = forwarding;
    await supabase.from("messages").insert({ conversation_id: convId, sender_id: uid, kind: f.kind, body: f.body, media_url: f.media_url, meta: f.meta as never, forwarded: true });
    setForwarding(null);
    toast.success("Message forwarded");
  };
  const setWallpaper = async (i: number) => {
    await supabase.from("profiles").update({ wallpaper: i }).eq("id", uid);
    await refreshProfile();
    setWallOpen(false);
    toast.success("Wallpaper changed 💕");
  };

  const [c1, c2] = isGroup && info?.conv?.state_code ? stateColors(info.conv.state_code) : ["", ""];
  const title = isGroup ? `${info?.conv?.name} State` : other?.name ?? "…";
  const sub = isGroup
    ? `${info?.profiles.length ?? 0} members · ${info?.profiles.filter(isOnline).length ?? 0} active`
    : typing ? "typing…" : other ? lastSeenText(other) : "";

  return (
    <div className="flex h-full flex-col">
      <header className="z-10 flex items-center gap-2 bg-brand px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground" style={isGroup ? { backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` } : undefined}>
        <button onClick={() => navigate({ to: isGroup ? "/states" : "/chats" })} className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15" aria-label="Back"><ArrowLeft /></button>
        {isGroup ? (
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-foreground/25 font-display font-bold">{info?.conv?.state_code}</div>
        ) : (
          <Avatar src={other?.avatar_url} name={other?.name} size={42} online={isOnline(other)} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs opacity-90">{sub}</p>
        </div>
        {!isGroup && other && (
          <>
            <button onClick={() => startCall(other, "video")} className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15" aria-label="Video call"><Video className="h-5 w-5" /></button>
            <button onClick={() => startCall(other, "voice")} className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15" aria-label="Voice call"><Phone className="h-5 w-5" /></button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15" aria-label="More"><MoreVertical className="h-5 w-5" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={() => setWallOpen(true)}><Palette className="mr-2 h-4 w-4" /> Wallpaper</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStarredOpen(true)}><Star className="mr-2 h-4 w-4" /> Starred messages</DropdownMenuItem>
            {isGroup && <DropdownMenuItem onClick={() => toast(info?.profiles.map((p) => p.name).join(", "))}><Users className="mr-2 h-4 w-4" /> Members</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 space-y-1.5 overflow-y-auto py-3" style={{ background: WALLPAPERS[me?.wallpaper ?? 0]?.css }}>
        <p className="mx-auto mb-3 w-fit rounded-full bg-card/80 px-3 py-1 text-center text-xs text-muted-foreground backdrop-blur">
          🔒 {isGroup ? `Welcome to the ${info?.conv?.name} group! Be nice 💕` : "Messages are private to you two"}
        </p>
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            m={m}
            mine={m.sender_id === uid}
            sender={byId.get(m.sender_id)}
            showSender={isGroup && messages[i - 1]?.sender_id !== m.sender_id}
            replied={m.reply_to ? msgById.get(m.reply_to) : null}
            starred={stars.includes(m.id)}
            onReply={() => setReplyTo(m)}
            onForward={() => setForwarding(m)}
            onStar={() => toggleStar(m)}
            onDelete={() => del(m)}
          />
        ))}
        {typing && (
          <div className="px-3"><span className="inline-flex gap-1 rounded-3xl rounded-bl-md bg-bubble-in px-4 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 150}ms` }} />)}</span></div>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={(o) => send(o)} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      <Dialog open={wallOpen} onOpenChange={setWallOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Chat wallpaper</DialogTitle></DialogHeader>
          <WallpaperGrid value={me?.wallpaper ?? 0} onPick={setWallpaper} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!forwarding} onOpenChange={(v) => !v && setForwarding(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>Forward to…</DialogTitle></DialogHeader>
          {chats.map((c) => (
            <button key={c.conv.id} onClick={() => forwardTo(c.conv.id)} className="flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-muted">
              <Avatar src={c.other?.avatar_url} name={c.other?.name} size={40} />
              <span className="font-bold">{c.other?.name}</span>
            </button>
          ))}
        </DialogContent>
      </Dialog>

      <Dialog open={starredOpen} onOpenChange={setStarredOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>⭐ Starred messages</DialogTitle></DialogHeader>
          {messages.filter((m) => stars.includes(m.id)).map((m) => (
            <div key={m.id} className="rounded-2xl bg-muted p-3 text-sm">
              <p className="text-xs font-bold text-primary">{byId.get(m.sender_id)?.name}</p>
              {previewText(m)}
            </div>
          ))}
          {!messages.some((m) => stars.includes(m.id)) && <p className="text-muted-foreground">Tap a message and choose Star to save it here.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

