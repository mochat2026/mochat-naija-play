import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, CheckCheck, CornerUpLeft, Download, FileText, Forward, Gamepad2, MapPin, Pause, Play, Star, Trash2, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fmtDuration, previewText, type Message, type Profile } from "@/lib/mochat";
import { cn } from "@/lib/utils";

export function VoicePlayer({ src, mine, duration }: { src: string; mine: boolean; duration?: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [len, setLen] = useState(duration ?? 0);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const t = () => setPos(a.currentTime);
    const e = () => { setPlaying(false); setPos(0); };
    const m = () => isFinite(a.duration) && setLen(a.duration);
    a.addEventListener("timeupdate", t);
    a.addEventListener("ended", e);
    a.addEventListener("loadedmetadata", m);
    return () => { a.removeEventListener("timeupdate", t); a.removeEventListener("ended", e); a.removeEventListener("loadedmetadata", m); };
  }, []);
  const toggle = () => {
    const a = ref.current!;
    if (playing) a.pause(); else a.play();
    setPlaying(!playing);
  };
  const pct = len ? Math.min(100, (pos / len) * 100) : 0;
  return (
    <div className="flex w-56 items-center gap-3 py-1">
      <audio ref={ref} src={src} preload="metadata" />
      <button onClick={toggle} className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", mine ? "bg-primary-foreground text-primary" : "bg-brand text-primary-foreground")}>
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="flex-1">
        <div className="flex h-6 items-center gap-[2px]">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className={cn("w-1 rounded-full transition-colors", (i / 28) * 100 < pct ? (mine ? "bg-primary-foreground" : "bg-primary") : mine ? "bg-primary-foreground/40" : "bg-muted-foreground/30")} style={{ height: `${30 + ((i * 53) % 70)}%` }} />
          ))}
        </div>
        <p className="text-[11px] opacity-80">{fmtDuration(playing ? pos : len)}</p>
      </div>
    </div>
  );
}

export function MessageBubble({
  m,
  mine,
  sender,
  showSender,
  replied,
  starred,
  onReply,
  onForward,
  onStar,
  onDelete,
}: {
  m: Message;
  mine: boolean;
  sender?: Profile;
  showSender?: boolean;
  replied?: Message | null;
  starred: boolean;
  onReply: () => void;
  onForward: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  const meta = (m.meta ?? {}) as Record<string, any>;
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isSticker = m.kind === "sticker" && !m.deleted;
  const hue = sender ? (sender.name.charCodeAt(0) * 47) % 360 : 0;

  const content = () => {
    if (m.deleted) return <p className="italic opacity-70">🚫 This message was deleted</p>;
    switch (m.kind) {
      case "sticker":
        return <span className="block text-7xl leading-none drop-shadow">{m.body}</span>;
      case "image":
        return (
          <a href={m.media_url!} target="_blank" rel="noreferrer">
            <img src={m.media_url!} alt="Photo" className="max-h-72 w-64 rounded-xl object-cover" />
            {m.body && <p className="mt-1">{m.body}</p>}
          </a>
        );
      case "video":
        return <video src={m.media_url!} controls className="max-h-72 w-64 rounded-xl" />;
      case "audio":
        return <VoicePlayer src={m.media_url!} mine={mine} duration={meta.duration} />;
      case "doc":
        return (
          <a href={m.media_url!} target="_blank" rel="noreferrer" className={cn("flex w-60 items-center gap-3 rounded-xl p-2", mine ? "bg-primary-foreground/15" : "bg-muted")}>
            <div className="grid h-11 w-10 place-items-center rounded-lg bg-violet text-primary-foreground"><FileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{m.body}</p>
              <p className="text-[11px] opacity-75">{meta.size ? `${Math.max(1, Math.round(meta.size / 1024))} KB` : "Document"} · {(m.body ?? "").split(".").pop()?.toUpperCase()}</p>
            </div>
            <Download className="h-4 w-4 opacity-70" />
          </a>
        );
      case "location":
        return (
          <a href={`https://www.google.com/maps?q=${meta.lat},${meta.lng}`} target="_blank" rel="noreferrer" className="block w-60">
            <iframe
              title="map"
              className="pointer-events-none h-32 w-full rounded-xl"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${meta.lng - 0.01},${meta.lat - 0.01},${meta.lng + 0.01},${meta.lat + 0.01}&marker=${meta.lat},${meta.lng}`}
            />
            <p className="mt-1 flex items-center gap-1 text-sm font-bold"><MapPin className="h-4 w-4" /> Shared location</p>
          </a>
        );
      case "game":
        return (
          <div className="w-60 space-y-2">
            <p className="flex items-center gap-2 font-bold"><Gamepad2 className="h-5 w-5" /> Let's play {meta.gameName}!</p>
            <p className="text-sm opacity-80">Room code: <b className="tracking-widest">{meta.code}</b></p>
            <Link to="/game/$id" params={{ id: meta.roomId }} className={cn("block rounded-full py-2 text-center text-sm font-bold", mine ? "bg-primary-foreground text-primary" : "bg-brand text-primary-foreground")}>
              {mine ? "Open game" : "Join game 🎮"}
            </Link>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap break-words">{m.body}</p>;
    }
  };

  return (
    <div className={cn("flex animate-pop px-3", mine ? "justify-end" : "justify-start")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "relative max-w-[80%] cursor-pointer px-3 py-2 text-[15px] shadow-sm outline-none",
              isSticker ? "bg-transparent shadow-none" : mine ? "rounded-3xl rounded-br-md bg-bubble-out text-bubble-out-foreground" : "rounded-3xl rounded-bl-md bg-bubble-in text-bubble-in-foreground",
            )}
          >
            {showSender && !mine && sender && (
              <p className="mb-0.5 text-xs font-extrabold" style={{ color: `oklch(0.6 0.2 ${hue})` }}>{sender.name}</p>
            )}
            {m.forwarded && <p className="mb-0.5 flex items-center gap-1 text-[11px] italic opacity-75"><Forward className="h-3 w-3" /> Forwarded</p>}
            {meta.statusText && <p className={cn("mb-1 rounded-xl border-l-4 border-violet px-2 py-1 text-xs", mine ? "bg-primary-foreground/15" : "bg-muted")}>Replied to status: {meta.statusText}</p>}
            {replied && (
              <div className={cn("mb-1 rounded-xl border-l-4 px-2 py-1 text-xs", mine ? "border-primary-foreground/70 bg-primary-foreground/15" : "border-primary bg-muted")}>
                <p className="line-clamp-2">{previewText(replied)}</p>
              </div>
            )}
            {content()}
            <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", isSticker ? "text-muted-foreground" : "opacity-75")}>
              {starred && <Star className="h-3 w-3 fill-current" />}
              {time}
              {mine && (m.kind === "text" ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={mine ? "end" : "start"} className="rounded-2xl">
          <DropdownMenuItem onClick={onReply}><CornerUpLeft className="mr-2 h-4 w-4" /> Reply</DropdownMenuItem>
          {!m.deleted && <DropdownMenuItem onClick={onForward}><Forward className="mr-2 h-4 w-4" /> Forward</DropdownMenuItem>}
          <DropdownMenuItem onClick={onStar}><Star className="mr-2 h-4 w-4" /> {starred ? "Unstar" : "Star"}</DropdownMenuItem>
          {m.body && m.kind === "text" && (
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(m.body ?? "")}><Copy className="mr-2 h-4 w-4" /> Copy</DropdownMenuItem>
          )}
          {mine && !m.deleted && (
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete for everyone</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
