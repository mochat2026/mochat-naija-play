import { MessageCircleHeart } from "lucide-react";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid place-items-center rounded-2xl bg-brand text-primary-foreground shadow-pop" style={{ width: size, height: size }}>
        <MessageCircleHeart style={{ width: size * 0.6, height: size * 0.6 }} />
      </div>
      <span className="font-display font-bold text-brand" style={{ fontSize: size * 0.6 }}>
        MoChat
      </span>
    </div>
  );
}
