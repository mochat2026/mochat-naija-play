import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";

export function TopBar({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between bg-brand px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-primary-foreground">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-1">
        {children}
        <Link to="/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-foreground/15">
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export function Fab({ onClick, children, label }: { onClick: () => void; children: ReactNode; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="absolute bottom-24 right-5 z-20 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-pop transition active:scale-90">
      {children}
    </button>
  );
}
