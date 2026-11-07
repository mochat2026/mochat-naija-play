import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, Camera, ChevronRight, Database, HelpCircle, LogOut, Moon, Palette, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/mochat/Avatar";
import { WallpaperGrid } from "@/components/mochat/WallpaperGrid";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMe, useSession } from "@/hooks/use-session";
import { STATES, stateName, uploadMedia } from "@/lib/mochat";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · MoChat" }, { name: "description", content: "Profile, privacy and app settings." }] }),
  component: SettingsPage,
});

type Panel = null | "profile" | "privacy" | "notifications" | "wallpaper" | "storage" | "help";
const inputCls = "w-full rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary";

function useLocalFlag(key: string, def: boolean) {
  const [v, setV] = useState(def);
  useEffect(() => { const s = localStorage.getItem(key); if (s !== null) setV(s === "1"); }, [key]);
  return [v, (n: boolean) => { localStorage.setItem(key, n ? "1" : "0"); setV(n); }] as const;
}

function SettingsPage() {
  const { uid, me } = useMe();
  const { refreshProfile, dark, setDark } = useSession();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(me?.name ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [state, setState] = useState(me?.state ?? "LA");
  const fileRef = useRef<HTMLInputElement>(null);
  const [readReceipts, setReadReceipts] = useLocalFlag("mc-read", true);
  const [lastSeen, setLastSeen] = useLocalFlag("mc-lastseen", true);
  const [msgNotif, setMsgNotif] = useLocalFlag("mc-n-msg", true);
  const [groupNotif, setGroupNotif] = useLocalFlag("mc-n-group", true);
  const [gameNotif, setGameNotif] = useLocalFlag("mc-n-game", true);
  const [sounds, setSounds] = useLocalFlag("mc-n-sound", true);

  const { data: storage } = useQuery({
    queryKey: ["storage", uid],
    enabled: panel === "storage",
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("kind").eq("sender_id", uid).neq("kind", "text");
      const counts: Record<string, number> = {};
      for (const m of data ?? []) counts[m.kind] = (counts[m.kind] ?? 0) + 1;
      return counts;
    },
  });

  const saveProfile = async () => {
    const changedState = state !== me?.state;
    await supabase.from("profiles").update({ name, bio, state }).eq("id", uid);
    if (changedState) await supabase.rpc("join_state", { _code: state });
    await refreshProfile();
    toast.success("Profile saved 💕");
    setPanel(null);
  };
  const changePhoto = async (f?: File) => {
    if (!f) return;
    const t = toast.loading("Uploading photo…");
    try {
      const url = await uploadMedia(uid, f, f.name);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", uid);
      await refreshProfile();
      toast.success("Photo updated", { id: t });
    } catch { toast.error("Upload failed", { id: t }); }
  };
  const setWallpaper = async (i: number) => {
    await supabase.from("profiles").update({ wallpaper: i }).eq("id", uid);
    await refreshProfile();
    toast.success("Wallpaper changed");
  };
  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const items = [
    { k: "profile" as const, icon: User, label: "Profile", sub: "Name, photo, bio, state" },
    { k: "privacy" as const, icon: Shield, label: "Privacy", sub: "Last seen, read receipts, status" },
    { k: "notifications" as const, icon: Bell, label: "Notifications", sub: "Messages, groups, games" },
    { k: "wallpaper" as const, icon: Palette, label: "Chat wallpaper", sub: "6 pink wallpapers" },
    { k: "storage" as const, icon: Database, label: "Storage and data", sub: "Media you've shared" },
    { k: "help" as const, icon: HelpCircle, label: "Help", sub: "FAQ, contact us" },
  ];

  const Toggle = ({ label, v, set }: { label: string; v: boolean; set: (b: boolean) => void }) => (
    <label className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 font-semibold">{label}<Switch checked={v} onCheckedChange={set} /></label>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 bg-brand px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-primary-foreground">
        <button onClick={() => navigate({ to: "/chats" })} className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15" aria-label="Back"><ArrowLeft /></button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      <div className="flex-1 overflow-y-auto pb-8">
        <button onClick={() => setPanel("profile")} className="flex w-full items-center gap-4 border-b p-5 text-left">
          <Avatar src={me?.avatar_url} name={me?.name} size={68} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">{me?.name}</p>
            <p className="truncate text-sm text-muted-foreground">{me?.bio}</p>
            <p className="text-xs text-muted-foreground">{me?.phone} · {stateName(me?.state)}</p>
          </div>
        </button>
        <label className="flex items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><Moon className="h-5 w-5" /></span>
          <span className="flex-1"><b>Dark mode</b><br /><span className="text-sm text-muted-foreground">{dark ? "On" : "Off"}</span></span>
          <Switch checked={dark} onCheckedChange={setDark} />
        </label>
        {items.map((it) => (
          <button key={it.k} onClick={() => setPanel(it.k)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/60">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><it.icon className="h-5 w-5" /></span>
            <span className="flex-1"><b>{it.label}</b><br /><span className="text-sm text-muted-foreground">{it.sub}</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        <button onClick={logout} className="mt-4 flex w-full items-center gap-4 px-5 py-3.5 font-bold text-destructive">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10"><LogOut className="h-5 w-5" /></span> Log out
        </button>
        <p className="mt-6 text-center text-xs text-muted-foreground">MoChat · Don't be alone, Chat Out 💕</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => changePhoto(e.target.files?.[0])} />
      <Dialog open={!!panel} onOpenChange={(v) => !v && setPanel(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>{items.find((i) => i.k === panel)?.label}</DialogTitle></DialogHeader>
          {panel === "profile" && (
            <div className="space-y-3">
              <button onClick={() => fileRef.current?.click()} className="relative mx-auto block">
                <Avatar src={me?.avatar_url} name={me?.name} size={96} />
                <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Camera className="h-4 w-4" /></span>
              </button>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
              <input className={inputCls} value={bio ?? ""} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
              <select className={inputCls} value={state ?? "LA"} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <button onClick={saveProfile} className="w-full rounded-full bg-brand py-3 font-bold text-primary-foreground">Save</button>
            </div>
          )}
          {panel === "privacy" && (
            <div className="space-y-2">
              <Toggle label="Show last seen" v={lastSeen} set={setLastSeen} />
              <Toggle label="Read receipts" v={readReceipts} set={setReadReceipts} />
              <p className="pt-2 text-sm font-bold">Status privacy</p>
              {[["everyone", "Everyone"], ["contacts", "My contacts"], ["nobody", "Nobody"]].map(([v, l]) => (
                <button key={v} onClick={async () => { await supabase.from("profiles").update({ status_privacy: v }).eq("id", uid); await refreshProfile(); }} className={`w-full rounded-2xl border-2 p-3 text-left font-semibold ${me?.status_privacy === v ? "border-primary bg-secondary" : "border-transparent bg-muted"}`}>{l}</button>
              ))}
            </div>
          )}
          {panel === "notifications" && (
            <div className="space-y-2">
              <Toggle label="Message notifications" v={msgNotif} set={setMsgNotif} />
              <Toggle label="State group notifications" v={groupNotif} set={setGroupNotif} />
              <Toggle label="Game invites" v={gameNotif} set={setGameNotif} />
              <Toggle label="Sounds" v={sounds} set={setSounds} />
            </div>
          )}
          {panel === "wallpaper" && <WallpaperGrid value={me?.wallpaper ?? 0} onPick={setWallpaper} />}
          {panel === "storage" && (
            <div className="grid grid-cols-2 gap-2">
              {[["image", "📷 Photos"], ["video", "🎥 Videos"], ["audio", "🎤 Voice notes"], ["doc", "📄 Documents"], ["sticker", "🦄 Stickers"], ["location", "📍 Locations"]].map(([k, l]) => (
                <div key={k} className="rounded-2xl bg-muted p-4"><p className="text-2xl font-bold text-primary">{storage?.[k] ?? 0}</p><p className="text-sm font-semibold">{l}</p></div>
              ))}
            </div>
          )}
          {panel === "help" && (
            <Accordion type="single" collapsible>
              {[
                ["How do I join my state group?", "Open the States tab and tap your state. You joined it automatically when you signed up."],
                ["How do I play a game with a friend?", "Go to Games, create a room, then tap Invite to send it to a chat — or share the 6-letter room code."],
                ["How do I change my wallpaper?", "In any chat tap ⋮ → Wallpaper, or use Settings → Chat wallpaper."],
                ["How long do statuses last?", "Every status disappears after 24 hours."],
                ["Contact us", "Email help@mochat.app — we reply within a day 💕"],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>
              ))}
            </Accordion>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
