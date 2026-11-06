import { useEffect, useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, MapPin, Mic, Paperclip, Send, Smile, Sticker, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJIS, STICKERS, fmtDuration, previewText, type Message } from "@/lib/mochat";

export type OutMsg = { kind: string; body?: string | null; file?: File | Blob; fileName?: string; meta?: Record<string, unknown> };

export function Composer({
  onSend,
  replyTo,
  onCancelReply,
  compact,
}: {
  onSend: (m: OutMsg) => Promise<void> | void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelRef = useRef(false);
  const mediaRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    onSend({ kind: "text", body: t });
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelRef.current) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        onSend({ kind: "audio", file: blob, fileName: `voice.${(rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`, meta: { duration: recSecsRef.current } });
      };
      rec.start();
      recRef.current = rec;
      setRecSecs(0);
      setRecording(true);
    } catch {
      toast.error("Allow microphone access to record voice notes");
    }
  };
  const recSecsRef = useRef(0);
  recSecsRef.current = recSecs;
  const stopRec = (cancel: boolean) => {
    cancelRef.current = cancel;
    recRef.current?.stop();
    setRecording(false);
  };

  const onFile = (f: File | undefined, kind?: string) => {
    if (!f) return;
    const k = kind ?? (f.type.startsWith("video") ? "video" : f.type.startsWith("image") ? "image" : "doc");
    onSend({ kind: k, file: f, fileName: f.name, body: k === "doc" ? f.name : null, meta: { size: f.size } });
    setAttachOpen(false);
  };

  const shareLocation = () => {
    setAttachOpen(false);
    const send = (lat: number, lng: number) => onSend({ kind: "location", meta: { lat, lng } });
    if (!navigator.geolocation) return send(6.5244, 3.3792);
    navigator.geolocation.getCurrentPosition(
      (p) => send(p.coords.latitude, p.coords.longitude),
      () => {
        toast("Location blocked — sharing Lagos as a demo 📍");
        send(6.5244, 3.3792);
      },
      { timeout: 8000 },
    );
  };

  const attachItems = [
    { label: "Photos & videos", icon: ImageIcon, onClick: () => mediaRef.current?.click(), cls: "bg-violet" },
    { label: "Camera", icon: Camera, onClick: () => camRef.current?.click(), cls: "bg-primary" },
    { label: "Document", icon: FileText, onClick: () => docRef.current?.click(), cls: "bg-chart-3" },
    { label: "Location", icon: MapPin, onClick: shareLocation, cls: "bg-success" },
  ];

  return (
    <div className="border-t border-border/50 bg-card/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      {replyTo && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-2xl border-l-4 border-primary bg-muted px-3 py-2 animate-pop">
          <p className="flex-1 truncate text-sm">↩︎ {previewText(replyTo)}</p>
          <button onClick={onCancelReply} aria-label="Cancel reply"><X className="h-4 w-4" /></button>
        </div>
      )}
      <input ref={mediaRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0], "image"); e.target.value = ""; }} />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" hidden onChange={(e) => { onFile(e.target.files?.[0], "doc"); e.target.value = ""; }} />

      {recording ? (
        <div className="flex items-center gap-3 px-2 py-1">
          <button onClick={() => stopRec(true)} className="grid h-11 w-11 place-items-center rounded-full bg-muted text-destructive" aria-label="Cancel recording"><Trash2 className="h-5 w-5" /></button>
          <div className="flex flex-1 items-center gap-2 font-bold">
            <span className="h-3 w-3 animate-pulse rounded-full bg-destructive" /> Recording {fmtDuration(recSecs)}
          </div>
          <button onClick={() => stopRec(false)} className="grid h-12 w-12 place-items-center rounded-full bg-brand text-primary-foreground shadow-pop" aria-label="Send voice note"><Send className="h-5 w-5" /></button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end gap-1 rounded-3xl bg-muted px-2 py-1">
            <Popover>
              <PopoverTrigger className="grid h-10 w-10 place-items-center text-muted-foreground" aria-label="Emoji"><Smile className="h-6 w-6" /></PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 rounded-3xl p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">EMOJIS</p>
                <div className="grid grid-cols-8 gap-1 text-2xl">
                  {EMOJIS.map((e, i) => <button key={i} className="rounded-lg hover:bg-muted" onClick={() => setText((t) => t + e)}>{e}</button>)}
                </div>
              </PopoverContent>
            </Popover>
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
              }}
              placeholder="Message"
              className="max-h-28 flex-1 resize-none bg-transparent py-2.5 outline-none"
            />
            {!compact && (
              <>
                <Popover>
                  <PopoverTrigger className="grid h-10 w-10 place-items-center text-muted-foreground" aria-label="Stickers"><Sticker className="h-5 w-5" /></PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-72 rounded-3xl p-3">
                    <p className="mb-2 text-xs font-bold text-muted-foreground">STICKERS</p>
                    <div className="grid grid-cols-4 gap-2 text-5xl">
                      {STICKERS.map((s) => <button key={s} className="rounded-2xl p-1 transition hover:scale-110 hover:bg-muted" onClick={() => onSend({ kind: "sticker", body: s })}>{s}</button>)}
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover open={attachOpen} onOpenChange={setAttachOpen}>
                  <PopoverTrigger className="grid h-10 w-10 place-items-center text-muted-foreground" aria-label="Attach"><Paperclip className="h-5 w-5" /></PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-72 rounded-3xl p-4">
                    <div className="grid grid-cols-4 gap-3">
                      {attachItems.map((a) => (
                        <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-1 text-[11px] font-semibold">
                          <span className={`grid h-12 w-12 place-items-center rounded-full text-primary-foreground ${a.cls}`}><a.icon className="h-5 w-5" /></span>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
          {text.trim() || compact ? (
            <button onClick={sendText} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground shadow-pop active:scale-90" aria-label="Send"><Send className="h-5 w-5" /></button>
          ) : (
            <button onClick={startRec} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground shadow-pop active:scale-90" aria-label="Record voice note"><Mic className="h-5 w-5" /></button>
          )}
        </div>
      )}
    </div>
  );
}
