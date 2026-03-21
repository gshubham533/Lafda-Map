"use client";

import { Marker } from "react-map-gl/maplibre";
import { categoryColor, type IncidentRow } from "@/lib/incidents";

export function IncidentMarker({ incident }: { incident: IncidentRow }) {
  const color = categoryColor(incident.type);

  return (
    <Marker longitude={incident.lng} latitude={incident.lat} anchor="center">
      <div className="relative flex h-5 w-5 items-center justify-center">
        {incident.is_live ? (
          <span
            className="absolute inline-flex h-5 w-5 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        ) : null}
        <span
          className="relative z-[1] h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: color }}
          title={incident.title}
        />
      </div>
    </Marker>
  );
}
