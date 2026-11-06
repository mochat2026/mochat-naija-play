import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation, Message, Profile } from "@/lib/mochat";

export type ChatItem = {
  conv: Conversation;
  other: Profile | null;
  last: Message | null;
  unread: number;
};

export function useChatList(uid: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["chats", uid],
    enabled: !!uid,
    queryFn: async (): Promise<ChatItem[]> => {
      const { data: mine } = await supabase
        .from("conversation_members")
        .select("conversation_id,last_read_at,conversations!inner(*)")
        .eq("user_id", uid)
        .eq("conversations.type", "direct");
      const rows = mine ?? [];
      const ids = rows.map((r) => r.conversation_id);
      if (!ids.length) return [];
      const [{ data: others }, { data: msgs }] = await Promise.all([
        supabase.from("conversation_members").select("conversation_id,profiles(*)").in("conversation_id", ids).neq("user_id", uid),
        supabase.from("messages").select("*").in("conversation_id", ids).order("created_at", { ascending: false }).limit(400),
      ]);
      return rows
        .map((r) => {
          const convMsgs = (msgs ?? []).filter((m) => m.conversation_id === r.conversation_id);
          return {
            conv: r.conversations as unknown as Conversation,
            other: ((others ?? []).find((o) => o.conversation_id === r.conversation_id)?.profiles as unknown as Profile) ?? null,
            last: convMsgs[0] ?? null,
            unread: convMsgs.filter((m) => m.sender_id !== uid && m.created_at > r.last_read_at).length,
          };
        })
        .sort((a, b) => (b.last?.created_at ?? b.conv.created_at).localeCompare(a.last?.created_at ?? a.conv.created_at));
    },
  });

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`chatlist-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["chats", uid] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, qc]);

  return query;
}
