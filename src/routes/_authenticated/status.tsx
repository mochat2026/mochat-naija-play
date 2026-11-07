import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Eye, Lock, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/mochat/TopBar";
import { Avatar } from "@/components/mochat/Avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe, useSession } from "@/hooks/use-session";
import { STATUS_BGS, fmtTime, uploadMedia, type Profile, type Status } from "@/lib/mochat";

export const Route = createFileRoute("/_authenticated/status")({
  head: () => ({ meta: [{ title: "Status · MoChat" }, { name: "description", content: "Share and view status updates." }] }),
  component: StatusPage,
});

type Group = { user: Profile; items: Status[]; seen: boolean };

function hoursLeft(s: Status) {
  const h = Math.max(0, (new Date(s.expires_at).getTime() - Date.now()) / 36e5);
  return h >= 1 ? `${Math.floor(h)}h left` : `${Math.ceil(h * 60)}m left`;
}

function StatusPage() {
  const { uid, me } = useMe();
  const { refreshProfile } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [textOpen, setTextOpen] = useState(false);
  const [text, setText] = useState("");
  const [bg, setBg] = useState(0);
  const [viewing, setViewing] = useState<Group | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["statuses", uid],
    queryFn: async () => {
      const { data: st } = await supabase.from("statuses").select("*, profiles(*)").gt("expires_at", new Date().toISOString()).order("created_at");
      const { data: views } = await supabase.from("status_views").select("status_id").eq("viewer_id", uid);
      const seenIds = new Set((views ?? []).map((v) => v.status_id));
      const groups = new Map<string, Group>();
      for (const s of st ?? []) {
        const p = s.profiles as unknown as Profile;
        const g = groups.get(s.user_id) ?? { user: p, items: [], seen: true };
        g.items.push(s);
        if (!seenIds.has(s.id)) g.seen = false;
        groups.set(s.user_id, g);
      }
      const mine = groups.get(uid);
      groups.delete(uid);
      return { mine, others: [...groups.values()] };
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`status-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => qc.invalidateQueries({ queryKey: ["statuses", uid] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, qc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["statuses", uid] });

  const postText = async () => {
    if (!text.trim()) return;
    await supabase.from("statuses").insert({ user_id: uid, kind: "text", body: text.trim(), bg: String(bg) });
    setText(""); setTextOpen(false); refresh();
    toast.success("Status posted ✨");
  };
  const postMedia = async (f?: File) => {
    if (!f) return;
    const t = toast.loading("Uploading status…");
    try {
      const url = await uploadMedia(uid, f, f.name);
      await supabase.from("statuses").insert({ user_id: uid, kind: f.type.startsWith("video") ? "video" : "image", media_url: url });
      refresh();
      toast.success("Status posted ✨", { id: t });
    } catch {
      toast.error("Upload failed", { id: t });
    }
  };
  const setPrivacy = async (v: string) => {
    await supabase.from("profiles").update({ status_privacy: v }).eq("id", uid);
    await refreshProfile();
    setPrivacyOpen(false);
    toast.success("Status privacy updated");
  };

  const unseen = data?.others.filter((g) => !g.seen) ?? [];
  const seen = data?.others.filter((g) => g.seen) ?? [];

  return (
    <div className="relative flex h-full flex-col">
      <TopBar title="Status">
        <button onClick={() => setPrivacyOpen(true)} aria-label="Status privacy" className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15"><Lock className="h-5 w-5" /></button>
      </TopBar>
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { postMedia(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => (data?.mine ? setViewing(data.mine) : fileRef.current?.click())} className="relative">
            <Avatar src={me?.avatar_url} name={me?.name} size={58} ring={data?.mine ? "new" : undefined} />
            {!data?.mine && <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /></span>}
          </button>
          <div className="flex-1">
            <p className="font-bold">My status</p>
            <p className="text-sm text-muted-foreground">
              {data?.mine ? `${data.mine.items.length} update${data.mine.items.length > 1 ? "s" : ""} · ${hoursLeft(data.mine.items[data.mine.items.length - 1])}` : "Tap to add status update"}
            </p>
          </div>
        </div>
        <p className="px-4 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-primary">Recent updates</p>
        {unseen.map((g) => <Row key={g.user.id} g={g} onOpen={() => setViewing(g)} />)}
        {seen.length > 0 && <p className="px-4 pb-1 pt-4 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Viewed updates</p>}
        {seen.map((g) => <Row key={g.user.id} g={g} onOpen={() => setViewing(g)} />)}
        {data && data.others.length === 0 && <p className="py-10 text-center text-muted-foreground">No updates from friends yet</p>}
      </div>

      <div className="absolute bottom-24 right-5 z-20 flex flex-col items-center gap-3">
        <button onClick={() => setTextOpen(true)} aria-label="Text status" className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow-pop"><Pencil className="h-5 w-5" /></button>
        <button onClick={() => fileRef.current?.click()} aria-label="Photo or video status" className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-pop"><Camera /></button>
      </div>

      {textOpen && (
        <div className="fixed inset-0 z-50 flex flex-col p-5 text-primary-foreground" style={{ background: STATUS_BGS[bg] }}>
          <div className="flex justify-between">
            <button onClick={() => setTextOpen(false)} aria-label="Close"><X className="h-7 w-7" /></button>
            <button onClick={() => setBg((bg + 1) % STATUS_BGS.length)} className="rounded-full bg-primary-foreground/20 px-4 py-1.5 font-bold">🎨 Colour</button>
          </div>
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a status" className="flex-1 resize-none bg-transparent text-center font-display text-4xl font-semibold outline-none placeholder:text-primary-foreground/60 pt-[30vh]" />
          <button onClick={postText} className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-primary-foreground text-primary shadow-pop" aria-label="Post"><Send /></button>
        </div>
      )}

      {viewing && (
        <StatusViewer
          group={viewing}
          mine={viewing.user.id === uid}
          onClose={() => { setViewing(null); refresh(); }}
          onReply={async (s, msg) => {
            const { data: conv } = await supabase.rpc("start_direct", { _other: viewing.user.id });
            if (!conv) return;
            await supabase.from("messages").insert({ conversation_id: conv, sender_id: uid, kind: "text", body: msg, meta: { statusText: s.body ?? (s.kind === "image" ? "📷 Photo" : "🎥 Video") } });
            toast.success("Reply sent", { action: { label: "Open chat", onClick: () => navigate({ to: "/chat/$id", params: { id: conv } }) } });
          }}
          onDelete={async (s) => { await supabase.from("statuses").delete().eq("id", s.id); setViewing(null); refresh(); }}
        />
      )}

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Who can see my status</DialogTitle></DialogHeader>
          {[["everyone", "Everyone on MoChat"], ["contacts", "My contacts"], ["nobody", "Nobody (hidden)"]].map(([v, l]) => (
            <button key={v} onClick={() => setPrivacy(v)} className={`rounded-2xl border-2 p-3 text-left font-bold ${me?.status_privacy === v ? "border-primary bg-secondary" : "border-transparent bg-muted"}`}>{l}</button>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ g, onOpen }: { g: Group; onOpen: () => void }) {
  const last = g.items[g.items.length - 1];
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 animate-pop">
      <Avatar src={g.user.avatar_url} name={g.user.name} size={54} ring={g.seen ? "seen" : "new"} />
      <div>
        <p className="font-bold">{g.user.name}</p>
        <p className="text-sm text-muted-foreground">{fmtTime(last.created_at)} · {hoursLeft(last)}</p>
      </div>
    </button>
  );
}

function StatusViewer({ group, mine, onClose, onReply, onDelete }: {
  group: Group; mine: boolean; onClose: () => void;
  onReply: (s: Status, msg: string) => void; onDelete: (s: Status) => void;
}) {
  const { uid } = useMe();
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [seenOpen, setSeenOpen] = useState(false);
  const s = group.items[i];

  const { data: viewers = [] } = useQuery({
    queryKey: ["views", s?.id],
    enabled: mine && !!s,
    queryFn: async () => (await supabase.from("status_views").select("viewed_at, profiles(*)").eq("status_id", s.id)).data ?? [],
  });

  useEffect(() => {
    if (!s) return;
    setProgress(0);
    if (!mine) supabase.from("status_views").upsert({ status_id: s.id, viewer_id: uid }).then(() => {});
  }, [s, mine, uid]);

  useEffect(() => {
    if (paused || seenOpen) return;
    const t = setInterval(() => setProgress((p) => p + 2), 100);
    return () => clearInterval(t);
  }, [paused, seenOpen, i]);

  useEffect(() => {
    if (progress >= 100) {
      if (i < group.items.length - 1) setI(i + 1);
      else onClose();
    }
  }, [progress, i, group.items.length, onClose]);

  if (!s) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground text-primary-foreground">
      <div className="flex gap-1 p-2">
        {group.items.map((_, k) => (
          <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-primary-foreground/30">
            <div className="h-full bg-primary-foreground" style={{ width: k < i ? "100%" : k === i ? `${Math.min(progress, 100)}%` : "0%" }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar src={group.user.avatar_url} name={group.user.name} size={40} />
        <div className="flex-1">
          <p className="font-bold">{mine ? "My status" : group.user.name}</p>
          <p className="text-xs opacity-80">{fmtTime(s.created_at)} · {hoursLeft(s)}</p>
        </div>
        {mine && <button onClick={() => onDelete(s)} aria-label="Delete status"><Trash2 /></button>}
        <button onClick={onClose} aria-label="Close"><X className="h-7 w-7" /></button>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onPointerDown={() => setPaused(true)}
        onPointerUp={(e) => {
          setPaused(false);
          const x = e.clientX / window.innerWidth;
          if (x < 0.3) setI(Math.max(0, i - 1));
          else if (x > 0.7) setProgress(100);
        }}
      >
        {s.kind === "text" && (
          <div className="grid h-full w-full place-items-center p-8 text-center font-display text-4xl font-semibold" style={{ background: STATUS_BGS[Number(s.bg) || 0] }}>{s.body}</div>
        )}
        {s.kind === "image" && <img src={s.media_url!} alt="" className="max-h-full max-w-full object-contain" />}
        {s.kind === "video" && <video src={s.media_url!} autoPlay playsInline className="max-h-full max-w-full" />}
        {s.kind !== "text" && s.body && <p className="absolute bottom-6 rounded-full bg-foreground/50 px-4 py-2">{s.body}</p>}
      </div>
      {mine ? (
        <button onClick={() => setSeenOpen(true)} className="flex items-center justify-center gap-2 py-5 font-bold"><Eye className="h-5 w-5" /> Seen by {viewers.length}</button>
      ) : (
        <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { onReply(s, reply.trim()); setReply(""); } }}>
          <input value={reply} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" className="flex-1 rounded-full bg-primary-foreground/15 px-4 py-3 outline-none placeholder:text-primary-foreground/60" />
          <button className="grid h-12 w-12 place-items-center rounded-full bg-brand" aria-label="Send reply"><Send className="h-5 w-5" /></button>
        </form>
      )}
      <Dialog open={seenOpen} onOpenChange={setSeenOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Seen by {viewers.length}</DialogTitle></DialogHeader>
          {viewers.map((v, k) => {
            const p = v.profiles as unknown as Profile;
            return (
              <div key={k} className="flex items-center gap-3">
                <Avatar src={p?.avatar_url} name={p?.name} size={40} />
                <div><p className="font-bold">{p?.name}</p><p className="text-xs text-muted-foreground">{fmtTime(v.viewed_at)}</p></div>
              </div>
            );
          })}
          {viewers.length === 0 && <p className="text-muted-foreground">No views yet</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
