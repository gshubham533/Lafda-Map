import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type LiveSessionHistoryRow = {
  id: string;
  incident_id: string;
  host_user_id: string;
  is_active: boolean;
  viewer_count: number;
  peak_viewers: number;
  created_at: string;
  ended_at: string | null;
};

export type LiveChatMessageHistory = {
  id: string;
  session_id: string;
  handle: string;
  body: string;
  created_at: string;
};

export const getLiveSessionsForIncident = cache(
  async (incidentId: string): Promise<LiveSessionHistoryRow[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_sessions")
      .select(
        "id, incident_id, host_user_id, is_active, viewer_count, peak_viewers, created_at, ended_at",
      )
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as LiveSessionHistoryRow[];
  },
);

export const getChatMessagesForIncident = cache(
  async (incidentId: string): Promise<LiveChatMessageHistory[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("live_chat_messages")
      .select("id, session_id, handle, body, created_at")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return [];
    return data as LiveChatMessageHistory[];
  },
);
