import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseIncidentRow, type IncidentRow } from "@/lib/incidents";

export const listAllIncidents = cache(async (): Promise<IncidentRow[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  const rows: IncidentRow[] = [];
  for (const raw of data) {
    const p = parseIncidentRow(raw as Record<string, unknown>);
    if (p) rows.push(p);
  }
  return rows;
});
