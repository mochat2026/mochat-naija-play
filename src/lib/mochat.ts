import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Status = Database["public"]["Tables"]["statuses"]["Row"];
export type GameRoom = Database["public"]["Tables"]["game_rooms"]["Row"];

export const STATES: { code: string; name: string; capital: string }[] = [
  ["AB", "Abia", "Umuahia"], ["AD", "Adamawa", "Yola"], ["AK", "Akwa Ibom", "Uyo"], ["AN", "Anambra", "Awka"],
  ["BA", "Bauchi", "Bauchi"], ["BY", "Bayelsa", "Yenagoa"], ["BE", "Benue", "Makurdi"], ["BO", "Borno", "Maiduguri"],
  ["CR", "Cross River", "Calabar"], ["DE", "Delta", "Asaba"], ["EB", "Ebonyi", "Abakaliki"], ["ED", "Edo", "Benin City"],
  ["EK", "Ekiti", "Ado-Ekiti"], ["EN", "Enugu", "Enugu"], ["FC", "FCT Abuja", "Abuja"], ["GO", "Gombe", "Gombe"],
  ["IM", "Imo", "Owerri"], ["JI", "Jigawa", "Dutse"], ["KD", "Kaduna", "Kaduna"], ["KN", "Kano", "Kano"],
  ["KT", "Katsina", "Katsina"], ["KE", "Kebbi", "Birnin Kebbi"], ["KO", "Kogi", "Lokoja"], ["KW", "Kwara", "Ilorin"],
  ["LA", "Lagos", "Ikeja"], ["NA", "Nasarawa", "Lafia"], ["NI", "Niger", "Minna"], ["OG", "Ogun", "Abeokuta"],
  ["ON", "Ondo", "Akure"], ["OS", "Osun", "Osogbo"], ["OY", "Oyo", "Ibadan"], ["PL", "Plateau", "Jos"],
  ["RI", "Rivers", "Port Harcourt"], ["SO", "Sokoto", "Sokoto"], ["TA", "Taraba", "Jalingo"], ["YO", "Yobe", "Damaturu"],
  ["ZA", "Zamfara", "Gusau"],
].map(([code, name, capital]) => ({ code, name, capital }));

export const stateName = (code?: string | null) => STATES.find((s) => s.code === code)?.name ?? "Lagos";

/** "Flag" colours for each state: Nigerian green + a unique hue band. */
export function stateColors(code: string): [string, string] {
  const i = Math.max(0, STATES.findIndex((s) => s.code === code));
  const hue = (i * 37) % 360;
  return [`oklch(0.62 0.17 150)`, `oklch(0.68 0.19 ${hue})`];
}

export const WALLPAPERS: { name: string; css: string }[] = [
  { name: "Bubblegum", css: "radial-gradient(circle at 20% 20%, oklch(0.93 0.05 355) 0 8%, transparent 9%), radial-gradient(circle at 80% 60%, oklch(0.93 0.05 320) 0 6%, transparent 7%), linear-gradient(160deg, oklch(0.97 0.025 355), oklch(0.95 0.035 340))" },
  { name: "Sunset Peach", css: "linear-gradient(180deg, oklch(0.95 0.04 40), oklch(0.9 0.08 355))" },
  { name: "Lilac Dream", css: "linear-gradient(135deg, oklch(0.93 0.05 320), oklch(0.9 0.07 355))" },
  { name: "Hearts", css: "radial-gradient(oklch(0.85 0.1 359) 1.5px, transparent 2px) 0 0/22px 22px, linear-gradient(oklch(0.96 0.03 355), oklch(0.96 0.03 355))" },
  { name: "Candy Stripes", css: "repeating-linear-gradient(45deg, oklch(0.95 0.035 355) 0 18px, oklch(0.92 0.05 355) 18px 36px)" },
  { name: "Midnight Rose", css: "radial-gradient(circle at 30% 10%, oklch(0.4 0.15 350), transparent 60%), linear-gradient(160deg, oklch(0.25 0.08 330), oklch(0.2 0.06 300))" },
];

export const STATUS_BGS = [
  "linear-gradient(135deg, oklch(0.68 0.21 359), oklch(0.63 0.25 304))",
  "linear-gradient(135deg, oklch(0.63 0.25 304), oklch(0.6 0.2 260))",
  "linear-gradient(135deg, oklch(0.75 0.16 40), oklch(0.68 0.21 359))",
  "linear-gradient(135deg, oklch(0.6 0.15 180), oklch(0.63 0.25 304))",
];

export const STICKERS = ["🥰", "😂", "🔥", "💃🏾", "🎉", "😍", "🙏🏾", "💯", "🤣", "😎", "🥳", "💖", "👑", "🦄", "🍕", "🌸"];
export const EMOJIS = "😀😂🤣😍🥰😘😎🤩🥳😭😅🙏🏾👍🏾👏🏾💪🏾🔥💯❤️💕💖💗✨🎉🌸🌹🍕🍔🍛⚽🎲🎮💃🏾🕺🏾😴🤔😏🙄😱🤗".match(/\p{Extended_Pictographic}(\u{1F3FE})?(\uFE0F)?/gu) ?? [];

export function isOnline(p?: Pick<Profile, "last_seen"> | null) {
  if (!p) return false;
  return Date.now() - new Date(p.last_seen).getTime() < 2 * 60 * 1000;
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function lastSeenText(p: Profile) {
  if (isOnline(p)) return "online";
  return `last seen ${fmtTime(p.last_seen)}`;
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function previewText(m?: Pick<Message, "kind" | "body" | "deleted"> | null) {
  if (!m) return "";
  if (m.deleted) return "🚫 This message was deleted";
  switch (m.kind) {
    case "image": return "📷 Photo";
    case "video": return "🎥 Video";
    case "audio": return "🎤 Voice note";
    case "doc": return `📄 ${m.body ?? "Document"}`;
    case "location": return "📍 Location";
    case "sticker": return m.body ?? "Sticker";
    default: return m.body ?? "";
  }
}

/** Upload to the private media bucket; returns a long-lived signed URL. */
export async function uploadMedia(userId: string, file: Blob, name = "file") {
  const ext = name.includes(".") ? name.split(".").pop() : (file.type.split("/")[1] ?? "bin");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (e2) throw e2;
  return data.signedUrl;
}

export function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@phone.mochat.app`;
}

export function avatarFallback(name?: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
