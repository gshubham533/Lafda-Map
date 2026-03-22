"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type LiveSessionMeta = {
  id: string;
  viewer_count: number;
};

/** Active live_sessions row for an incident + realtime refresh. */
export function useLiveSessionMeta(incidentId: string | null | undefined) {
  const [meta, setMeta] = useState<LiveSessionMeta | null>(null);

  useEffect(() => {
    if (!incidentId) {
      setMeta(null);
      return;
    }

    const supabase = createClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMeta(null);
      return;
    }

    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, viewer_count")
        .eq("incident_id", incidentId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        setMeta(null);
        return;
      }
      setMeta({
        id: data.id as string,
        viewer_count: Number(data.viewer_count) || 0,
      });
    }

    void load();

    const channel = supabase
      .channel(`live_sessions:${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_sessions",
          filter: `incident_id=eq.${incidentId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [incidentId]);

  return meta;
}
