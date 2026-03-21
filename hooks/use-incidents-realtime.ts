"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  parseIncidentRow,
  type IncidentRow,
} from "@/lib/incidents";

type UseIncidentsResult = {
  incidents: IncidentRow[];
  loading: boolean;
  error: string | null;
};

export function useIncidentsRealtime(): UseIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setLoading(false);
      setError(null);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const applyRealtimeRow = (row: Record<string, unknown>) => {
      const parsed = parseIncidentRow(row);
      if (!parsed) return;
      setIncidents((prev) => {
        const idx = prev.findIndex((i) => i.id === parsed.id);
        if (idx === -1) return [parsed, ...prev];
        const next = [...prev];
        next[idx] = parsed;
        return next.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    };

    const removeById = (id: string) => {
      setIncidents((prev) => prev.filter((i) => i.id !== id));
    };

    async function loadInitial() {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (qErr) {
        setError(
          qErr.message.includes("relation") || qErr.code === "42P01"
            ? "Run the incidents migration in Supabase (see README)."
            : qErr.message,
        );
        setIncidents([]);
        setLoading(false);
        return;
      }

      const rows: IncidentRow[] = [];
      for (const raw of data ?? []) {
        const p = parseIncidentRow(raw as Record<string, unknown>);
        if (p) rows.push(p);
      }
      setIncidents(rows);
      setLoading(false);
    }

    void loadInitial();

    const channel = supabase
      .channel("public:incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            applyRealtimeRow(payload.new as Record<string, unknown>);
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Record<string, unknown> | null;
            const id = oldRow && typeof oldRow.id === "string" ? oldRow.id : null;
            if (id) removeById(id);
          }
        },
      )
      .subscribe((status, err) => {
        if (cancelled) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[LafdaMap] Realtime:", status, err?.message ?? err);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { incidents, loading, error };
}
