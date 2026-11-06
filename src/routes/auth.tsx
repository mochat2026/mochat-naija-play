import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/mochat/Logo";
import { Avatar } from "@/components/mochat/Avatar";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { STATES, phoneToEmail, uploadMedia } from "@/lib/mochat";
import { useSession } from "@/hooks/use-session";

type Search = { mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signin" ? "signin" : s.mode === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to MoChat" },
      { name: "description", content: "Log in or sign up to MoChat with your phone number." },
      { property: "og:title", content: "Sign in to MoChat" },
      { property: "og:description", content: "Join MoChat with your phone number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const inputCls = "w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signup");
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [state, setState] = useState("LA");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && step !== "profile") navigate({ to: "/chats" });
  }, [user, step, navigate]);

  const fullPhone = `+234${phone.replace(/\D/g, "").replace(/^0/, "")}`;

  const sendOtp = () => {
    if (phone.replace(/\D/g, "").length < 10) return toast.error("Enter a valid phone number");
    if (pin.length < 6) return toast.error("Your PIN must be 6 digits");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setDemoCode(code);
    setOtp("");
    setStep("otp");
    toast(`MoChat demo code: ${code}`, { description: "In the real app this comes by SMS.", duration: 10000 });
  };

  const verifyOtp = async () => {
    if (otp !== demoCode) return toast.error("Wrong code, try again");
    if (mode === "signup") return setStep("profile");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(fullPhone), password: pin });
    setBusy(false);
    if (error) return toast.error("Phone number or PIN is not correct");
    navigate({ to: "/chats" });
  };

  const finishSignup = async () => {
    if (name.trim().length < 2) return toast.error("Tell us your name");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: phoneToEmail(fullPhone),
      password: pin,
      options: { emailRedirectTo: window.location.origin, data: { name: name.trim(), phone: fullPhone, bio, state } },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message.includes("registered") ? "This number already has an account — sign in instead" : error.message);
    }
    if (photo && data.user) {
      try {
        const url = await uploadMedia(data.user.id, photo, photo.name);
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", data.user.id);
      } catch {
        toast.error("Couldn't upload your photo, you can add it in Settings");
      }
    }
    setBusy(false);
    toast.success(`Welcome to MoChat, ${name.split(" ")[0]}! 💕`);
    navigate({ to: "/chats" });
  };

  return (
    <main className="min-h-screen bg-soft">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (step === "phone" ? navigate({ to: "/" }) : setStep(step === "profile" ? "otp" : "phone"))}
            className="grid h-10 w-10 place-items-center rounded-full bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Logo size={32} />
          <div className="w-10" />
        </div>

        {step === "phone" && (
          <div className="mt-10 animate-pop space-y-5">
            <div>
              <h1 className="text-3xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back 💕"}</h1>
              <p className="mt-1 text-muted-foreground">Enter your phone number and a 6-digit PIN.</p>
            </div>
            <div className="flex rounded-full bg-card p-1">
              {(["signup", "signin"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-full py-2 text-sm font-bold transition ${mode === m ? "bg-brand text-primary-foreground" : "text-muted-foreground"}`}>
                  {m === "signup" ? "Sign up" : "Log in"}
                </button>
              ))}
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Phone number</span>
              <div className="flex gap-2">
                <span className="grid place-items-center rounded-2xl border border-input bg-card px-3 font-semibold">🇳🇬 +234</span>
                <input className={inputCls} inputMode="tel" placeholder="803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">6-digit PIN</span>
              <input className={inputCls} type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </label>
            <button onClick={sendOtp} className="w-full rounded-full bg-brand py-4 font-display text-lg font-semibold text-primary-foreground shadow-pop active:scale-95">
              Send code
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="mt-10 animate-pop space-y-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand text-primary-foreground shadow-pop">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Verify your number</h1>
              <p className="mt-1 text-muted-foreground">Enter the 6-digit code sent to {fullPhone}</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-11 bg-card text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="rounded-2xl bg-card px-4 py-3 text-sm">
              Demo mode: your code is <b className="text-primary tracking-widest">{demoCode}</b>
            </p>
            <button disabled={busy || otp.length < 6} onClick={verifyOtp} className="w-full rounded-full bg-brand py-4 font-display text-lg font-semibold text-primary-foreground shadow-pop disabled:opacity-50">
              {busy ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : "Verify"}
            </button>
            <button onClick={sendOtp} className="text-sm font-semibold text-primary">Resend code</button>
          </div>
        )}

        {step === "profile" && (
          <div className="mt-8 animate-pop space-y-4">
            <div>
              <h1 className="text-3xl font-bold">Your profile</h1>
              <p className="mt-1 text-muted-foreground">Add a photo, name and bio so friends know it's you.</p>
            </div>
            <button onClick={() => fileRef.current?.click()} className="relative mx-auto block">
              <Avatar src={photo ? URL.createObjectURL(photo) : null} name={name || "?"} size={104} />
              <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop">
                <Camera className="h-4 w-4" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputCls} placeholder="Bio (e.g. Living my best life ✨)" value={bio} onChange={(e) => setBio(e.target.value)} />
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Your state — you'll join its group chat</span>
              <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </label>
            <button disabled={busy} onClick={finishSignup} className="w-full rounded-full bg-brand py-4 font-display text-lg font-semibold text-primary-foreground shadow-pop disabled:opacity-50">
              {busy ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : "Start chatting 💕"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
