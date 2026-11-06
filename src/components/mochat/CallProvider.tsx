import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX, SwitchCamera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fmtDuration, type Profile } from "@/lib/mochat";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

type CallCtx = { startCall: (p: Profile, kind: "voice" | "video") => void };
const Ctx = createContext<CallCtx>({ startCall: () => {} });
export const useCall = () => useContext(Ctx);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [call, setCall] = useState<{ peer: Profile; kind: "voice" | "video" } | null>(null);
  const [phase, setPhase] = useState<"ringing" | "connected">("ringing");
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCall = (peer: Profile, kind: "voice" | "video") => {
    setCall({ peer, kind });
    setPhase("ringing");
    setSecs(0);
    setMuted(false);
    setSpeaker(kind === "video");
    setVideoOn(kind === "video");
  };

  useEffect(() => {
    if (!call) return;
    const answer = setTimeout(() => setPhase("connected"), 3000);
    return () => clearTimeout(answer);
  }, [call]);

  useEffect(() => {
    if (phase !== "connected" || !call) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, call]);

  // camera preview for video calls
  useEffect(() => {
    if (!call || !videoOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false }).then((s) => {
      if (cancelled) return s.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [call, videoOn]);

  const end = async () => {
    if (call && user) {
      await supabase.from("calls").insert({
        caller_id: user.id,
        callee_id: call.peer.id,
        kind: call.kind,
        status: phase === "connected" ? "answered" : "missed",
        duration: secs,
      });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCall(null);
  };

  const Btn = ({ on, onClick, children, label, danger }: { on?: boolean; onClick: () => void; children: ReactNode; label: string; danger?: boolean }) => (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-1.5 text-xs font-semibold text-primary-foreground">
      <span className={cn("grid h-16 w-16 place-items-center rounded-full backdrop-blur transition active:scale-90", danger ? "bg-destructive" : on ? "bg-primary-foreground text-primary" : "bg-primary-foreground/20")}>
        {children}
      </span>
      {label}
    </button>
  );

  return (
    <Ctx.Provider value={{ startCall }}>
      {children}
      {call && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-brand px-6 py-12 text-primary-foreground animate-in fade-in">
          {call.kind === "video" && videoOn && (
            <video ref={videoRef} autoPlay muted playsInline className={cn("absolute object-cover transition-all", phase === "connected" ? "right-4 top-4 h-44 w-32 rounded-3xl border-2 border-primary-foreground/60 shadow-pop" : "inset-0 h-full w-full opacity-40")} />
          )}
          <div className="relative z-10 text-center">
            <p className="text-sm font-semibold opacity-80">{call.kind === "video" ? "MoChat video call" : "MoChat voice call"}</p>
            <h2 className="mt-1 text-3xl font-bold">{call.peer.name}</h2>
            <p className="mt-1 font-semibold opacity-90">{phase === "ringing" ? "Ringing…" : fmtDuration(secs)}</p>
          </div>
          <div className={cn("relative z-10 rounded-full", phase === "ringing" && "animate-pulse-ring")}>
            <Avatar src={call.peer.avatar_url} name={call.peer.name} size={150} />
          </div>
          <div className="relative z-10 flex w-full max-w-sm justify-between">
            <Btn on={muted} onClick={() => setMuted(!muted)} label={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOff /> : <Mic />}
            </Btn>
            <Btn on={speaker} onClick={() => setSpeaker(!speaker)} label="Speaker">
              {speaker ? <Volume2 /> : <VolumeX />}
            </Btn>
            <Btn on={videoOn} onClick={() => setVideoOn(!videoOn)} label={videoOn ? "Video off" : "Video on"}>
              {videoOn ? <Video /> : <VideoOff />}
            </Btn>
            {call.kind === "video" && (
              <Btn onClick={() => {}} label="Flip">
                <SwitchCamera />
              </Btn>
            )}
            <Btn danger onClick={end} label="End">
              <PhoneOff />
            </Btn>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
