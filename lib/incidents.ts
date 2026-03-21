export type IncidentType = "street_fight" | "road_rage" | "jcb" | "chaos";

export type IncidentFilter = "all" | IncidentType;

export type IncidentRow = {
  id: string;
  user_id: string | null;
  type: IncidentType;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  is_live: boolean;
  created_at: string;
};

/** PRD §1.4 pin colors */
export function categoryColor(type: IncidentType): string {
  switch (type) {
    case "street_fight":
      return "#FF3B3B";
    case "road_rage":
      return "#FF8C00";
    case "jcb":
      return "#FFD700";
    case "chaos":
      return "#FF4D88";
  }
}

export const FILTER_OPTIONS: { value: IncidentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "street_fight", label: "Street Fight" },
  { value: "road_rage", label: "Road Rage" },
  { value: "jcb", label: "JCB Khudai" },
  { value: "chaos", label: "Chaos" },
];

/** Report flow: 2×2 category grid (PRD §1.4). */
export const REPORT_CATEGORIES: {
  type: IncidentType;
  label: string;
  emoji: string;
}[] = [
  { type: "street_fight", label: "Street Fight", emoji: "🥊" },
  { type: "road_rage", label: "Road Rage", emoji: "🚗" },
  { type: "jcb", label: "JCB Khudai", emoji: "🚜" },
  { type: "chaos", label: "Chaos / Other", emoji: "🔥" },
];

export function isIncidentType(v: string): v is IncidentType {
  return (
    v === "street_fight" ||
    v === "road_rage" ||
    v === "jcb" ||
    v === "chaos"
  );
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Parse Supabase row; returns null if invalid. */
export function parseIncidentRow(
  row: Record<string, unknown>,
): IncidentRow | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;
  const type = row.type;
  if (typeof type !== "string" || !isIncidentType(type)) return null;
  const title = row.title;
  if (typeof title !== "string") return null;
  const lat = asFiniteNumber(row.lat);
  const lng = asFiniteNumber(row.lng);
  if (lat === null || lng === null) return null;
  const user_id =
    row.user_id === null || row.user_id === undefined
      ? null
      : typeof row.user_id === "string"
        ? row.user_id
        : null;
  const description =
    row.description === null || row.description === undefined
      ? null
      : typeof row.description === "string"
        ? row.description
        : null;
  const is_live = Boolean(row.is_live);
  const created_at =
    typeof row.created_at === "string" ? row.created_at : String(row.created_at ?? "");
  if (!created_at) return null;

  return {
    id,
    user_id,
    type,
    title,
    description,
    lat,
    lng,
    is_live,
    created_at,
  };
}
