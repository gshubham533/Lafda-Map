import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseIncidentRow, type IncidentRow } from "@/lib/incidents";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getIncidentById = cache(
  async (id: string): Promise<IncidentRow | null> => {
    if (!UUID_RE.test(id)) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return parseIncidentRow(data as Record<string, unknown>);
  },
);
