import type { SupabaseClient } from "@supabase/supabase-js";

export type LiveSessionRow = {
  id: string;
  host_user_id: string;
  viewer_count: number;
  is_active: boolean;
};

export async function fetchActiveLiveSession(
  supabase: SupabaseClient,
  incidentId: string,
): Promise<{ session: LiveSessionRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, host_user_id, viewer_count, is_active")
    .eq("incident_id", incidentId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return { session: null, error: new Error(error.message) };
  }
  if (!data) return { session: null, error: null };
  return {
    session: data as LiveSessionRow,
    error: null,
  };
}

export async function startLiveSession(
  supabase: SupabaseClient,
  incidentId: string,
): Promise<{ sessionId: string } | { error: string; code?: string }> {
  const { data, error } = await supabase.rpc("start_live_session_for_incident", {
    p_incident_id: incidentId,
  });

  if (error) {
    return { error: error.message, code: error.code };
  }
  if (typeof data !== "string" || !data) {
    return { error: "No session id returned" };
  }
  return { sessionId: data };
}

export async function endLiveSession(
  supabase: SupabaseClient,
  sessionId: string,
  hostUserId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("live_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("host_user_id", hostUserId);

  if (error) return { error: error.message };
  return { error: null };
}
