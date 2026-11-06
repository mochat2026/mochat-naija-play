import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "./Avatar";
import { isOnline, type Profile } from "@/lib/mochat";
import { useMe } from "@/hooks/use-session";

export function useContacts() {
  const { uid } = useMe();
  return useQuery({
    queryKey: ["contacts", uid],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").neq("id", uid).order("name").limit(500);
      return data ?? [];
    },
  });
}

export function ContactPicker({
  open,
  onOpenChange,
  title,
  onPick,
  action,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onPick: (p: Profile) => void;
  action?: (p: Profile) => ReactNode;
}) {
  const { data = [] } = useContacts();
  const [q, setQ] = useState("");
  const list = data.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone ?? "").includes(q));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden rounded-3xl p-0">
        <DialogHeader className="bg-brand px-5 py-4 text-primary-foreground">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-4">
          <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or number" className="flex-1 bg-transparent outline-none" />
          </div>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-2 pb-4">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-muted">
              <button className="flex flex-1 items-center gap-3 text-left" onClick={() => onPick(p)}>
                <Avatar src={p.avatar_url} name={p.name} size={44} online={isOnline(p)} />
                <div className="min-w-0">
                  <p className="font-bold">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.bio}</p>
                </div>
              </button>
              {action?.(p)}
            </div>
          ))}
          {list.length === 0 && <p className="py-8 text-center text-muted-foreground">No one found</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
