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
  hostUserId: string,
): Promise<{ sessionId: string } | { error: string; code?: string }> {
  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      incident_id: incidentId,
      host_user_id: hostUserId,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, code: error.code };
  }
  return { sessionId: data.id as string };
}

export async function endLiveSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("live_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) return { error: error.message };
  return { error: null };
}
