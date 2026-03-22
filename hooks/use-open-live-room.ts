"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { startLiveSession } from "@/lib/live-sessions";
import type { IncidentRow } from "@/lib/incidents";

function isUniqueViolation(code: string | undefined) {
  return code === "23505";
}

export type LiveRoomState = {
  mode: "host" | "viewer";
  incident: IncidentRow;
  sessionId: string;
};

export function useOpenLiveRoom() {
  const [liveRoom, setLiveRoom] = useState<LiveRoomState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openLive = useCallback(
    async (opts: {
      mode: "host" | "viewer";
      incident: IncidentRow;
      sessionId?: string;
    }) => {
      setActionError(null);
      const supabase = createClient();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setActionError("Supabase is not configured.");
        return false;
      }

      if (opts.mode === "host") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setActionError("Could not start stream (sign-in).");
          return false;
        }
        const r = await startLiveSession(
          supabase,
          opts.incident.id,
          user.id,
        );
        if ("error" in r) {
          if (isUniqueViolation(r.code)) {
            setActionError("Someone is already live on this pin.");
          } else {
            setActionError(r.error);
          }
          return false;
        }
        setLiveRoom({
          mode: "host",
          incident: opts.incident,
          sessionId: r.sessionId,
        });
        return true;
      }

      if (!opts.sessionId) return false;
      setLiveRoom({
        mode: "viewer",
        incident: opts.incident,
        sessionId: opts.sessionId,
      });
      return true;
    },
    [],
  );

  const closeLive = useCallback(() => setLiveRoom(null), []);

  const clearLiveError = useCallback(() => setActionError(null), []);

  return {
    liveRoom,
    openLive,
    closeLive,
    actionError,
    clearLiveError,
  };
}
