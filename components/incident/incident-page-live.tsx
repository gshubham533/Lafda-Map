"use client";

import { LiveRoom } from "@/components/live/live-room";
import { IncidentDetailCard } from "@/components/map/incident-detail-card";
import { useLiveSessionMeta } from "@/hooks/use-live-session-meta";
import { useOpenLiveRoom } from "@/hooks/use-open-live-room";
import type { IncidentRow } from "@/lib/incidents";

export function IncidentPageLive({ incident }: { incident: IncidentRow }) {
  const meta = useLiveSessionMeta(incident.id);
  const {
    liveRoom,
    openLive,
    closeLive,
    actionError,
    clearLiveError,
  } = useOpenLiveRoom();

  return (
    <>
      <IncidentDetailCard
        incident={incident}
        variant="page"
        liveSessionId={meta?.id}
        liveViewerCount={meta?.viewer_count}
        actionError={actionError}
        onGoLive={() => void openLive({ mode: "host", incident })}
        onWatchLive={() => {
          if (!meta?.id) return;
          void openLive({
            mode: "viewer",
            incident,
            sessionId: meta.id,
          });
        }}
      />
      {liveRoom ? (
        <LiveRoom
          incident={liveRoom.incident}
          sessionId={liveRoom.sessionId}
          mode={liveRoom.mode}
          onLeave={() => {
            closeLive();
            clearLiveError();
          }}
        />
      ) : null}
    </>
  );
}
