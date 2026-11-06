import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Gamepad2, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { Logo } from "@/components/mochat/Logo";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoChat — Don't be alone, Chat Out" },
      { name: "description", content: "Chat, share status, meet people from your state and play Ludo, Chess, Whot & Tic-Tac-Toe with friends on MoChat." },
      { property: "og:title", content: "MoChat — Don't be alone, Chat Out" },
      { property: "og:description", content: "Colourful chats, state groups and live games with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/chats" });
  }, [user, loading, navigate]);

  const features = [
    { icon: MessageCircle, label: "Chats & calls" },
    { icon: Sparkles, label: "Status" },
    { icon: MapPin, label: "State groups" },
    { icon: Gamepad2, label: "Live games" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-soft">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet/25 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-between px-6 py-12 text-center">
        <Logo size={44} />
        <div className="animate-floaty">
          <div className="relative mx-auto h-56 w-56">
            <div className="absolute inset-0 rotate-6 rounded-[3rem] bg-brand shadow-pop" />
            <div className="absolute inset-3 -rotate-3 grid place-items-center rounded-[2.5rem] bg-card text-7xl">💬</div>
            <span className="absolute -left-6 top-6 rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm font-bold shadow-pop animate-pop">Hey! 👋🏾</span>
            <span className="absolute -right-6 bottom-8 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-pop">Ludo? 🎲</span>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Don't be alone, <span className="text-brand">Chat Out</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Chat with friends, meet people from your state and play games together — all in one colourful app.</p>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {features.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1 rounded-2xl bg-card/70 p-2 text-[11px] font-semibold">
                <f.icon className="h-5 w-5 text-primary" />
                {f.label}
              </div>
            ))}
          </div>
        </div>
        <div className="w-full space-y-3">
          <Link to="/auth" search={{ mode: "signup" }} className="block w-full rounded-full bg-brand py-4 font-display text-lg font-semibold text-primary-foreground shadow-pop transition-transform active:scale-95">
            Get started
          </Link>
          <Link to="/auth" search={{ mode: "signin" }} className="block w-full rounded-full bg-card py-4 font-semibold text-primary">
            I already have an account
          </Link>
        </div>
      </div>
    </main>
  );
}
