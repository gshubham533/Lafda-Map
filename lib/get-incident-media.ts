import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type IncidentMediaKind = "image" | "video" | "recording";

export type IncidentMediaRow = {
  id: string;
  incident_id: string;
  user_id: string;
  storage_path: string;
  mime_type: string;
  kind: IncidentMediaKind;
  created_at: string;
};

export const getIncidentMediaForIncident = cache(
  async (incidentId: string): Promise<IncidentMediaRow[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("incident_media")
      .select(
        "id, incident_id, user_id, storage_path, mime_type, kind, created_at",
      )
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as IncidentMediaRow[];
  },
);
