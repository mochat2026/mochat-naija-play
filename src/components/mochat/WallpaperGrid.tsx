import { Check } from "lucide-react";
import { WALLPAPERS } from "@/lib/mochat";

export function WallpaperGrid({ value, onPick }: { value: number; onPick: (i: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {WALLPAPERS.map((w, i) => (
        <button key={w.name} onClick={() => onPick(i)} className="space-y-1 text-xs font-semibold">
          <div className="relative h-32 rounded-2xl border-2 shadow-sm" style={{ background: w.css, borderColor: value === i ? "var(--primary)" : "transparent" }}>
            {value === i && <Check className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />}
          </div>
          {w.name}
        </button>
      ))}
    </div>
  );
}

