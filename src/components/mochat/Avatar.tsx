import { cn } from "@/lib/utils";
import { avatarFallback } from "@/lib/mochat";

export function Avatar({
  src,
  name,
  size = 48,
  online,
  ring,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  online?: boolean;
  ring?: "new" | "seen";
  className?: string;
}) {
  const inner = (
    <div
      className="relative overflow-hidden rounded-full bg-brand text-primary-foreground grid place-items-center font-display font-semibold"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : avatarFallback(name)}
    </div>
  );
  return (
    <div className={cn("relative shrink-0", className)}>
      {ring ? (
        <div className={ring === "new" ? "ring-status" : "ring-status-seen"}>
          <div className="rounded-full bg-background p-[2px]">{inner}</div>
        </div>
      ) : (
        inner
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
      )}
    </div>
  );
}
