import type { SupabaseClient } from "@supabase/supabase-js";

export type LiveChatMessageRow = {
  id: string;
  session_id: string;
  incident_id: string;
  user_id: string | null;
  handle: string;
  body: string;
  created_at: string;
};

export async function fetchChatMessagesForSession(
  supabase: SupabaseClient,
  sessionId: string,
  limit = 200,
): Promise<LiveChatMessageRow[]> {
  const { data, error } = await supabase
    .from("live_chat_messages")
    .select("id, session_id, incident_id, user_id, handle, body, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as LiveChatMessageRow[];
}
