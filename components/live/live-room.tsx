"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type SimplePeer from "simple-peer";
import { Send, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchChatMessagesForSession } from "@/lib/live-chat";
import { endLiveSession } from "@/lib/live-sessions";
import { getRtcConfiguration } from "@/lib/webrtc-config";
import {
  anonymousReporterHandle,
  categoryColor,
  categoryLabel,
  type IncidentRow,
} from "@/lib/incidents";

type ChatMsg = {
  id: string;
  handle: string;
  text: string;
  ts: number;
};

type SignalPayload = {
  viewerKey: string;
  from: "host" | "viewer";
  data: SimplePeer.SignalData;
};

type PeerInstance = SimplePeer.Instance;

export type LiveRoomProps = {
  incident: IncidentRow;
  sessionId: string;
  mode: "host" | "viewer";
  onLeave: () => void;
};

function liveChannelName(sessionId: string) {
  return `live:${sessionId}`;
}

function replaceVideoTrackOnPeers(
  peers: Map<string, PeerInstance>,
  track: MediaStreamTrack,
) {
  peers.forEach((peer) => {
    const pc = (peer as unknown as { _pc?: RTCPeerConnection })._pc;
    if (!pc) return;
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === "video") {
        void sender.replaceTrack(track);
        break;
      }
    }
  });
}

export function LiveRoom({ incident, sessionId, mode, onLeave }: LiveRoomProps) {
  const [error, setError] = useState<string | null>(null);
  const [presenceViewers, setPresenceViewers] = useState(0);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [myHandle, setMyHandle] = useState("anonymous_????");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const hostStreamRef = useRef<MediaStream | null>(null);
  const hostPeersRef = useRef<Map<string, PeerInstance>>(new Map());
  const facingModeRef = useRef<"user" | "environment">("user");

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setMyHandle(anonymousReporterHandle(user?.id ?? null));
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadChatHistory() {
      const supabase = createClient();
      const rows = await fetchChatMessagesForSession(supabase, sessionId);
      if (cancelled) return;
      setChat(
        rows.map((r) => ({
          id: r.id,
          handle: r.handle,
          text: r.body,
          ts: new Date(r.created_at).getTime(),
        })),
      );
    }
    void loadChatHistory();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOs = html.style.overscrollBehavior;
    const prevBodyOs = body.style.overscrollBehavior;
    const prevBodyTouch = body.style.touchAction;
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "manipulation";
    return () => {
      html.style.overscrollBehavior = prevHtmlOs;
      body.style.overscrollBehavior = prevBodyOs;
      body.style.touchAction = prevBodyTouch;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const rtc = getRtcConfiguration();
    const presenceKey =
      mode === "host" ? `host:${crypto.randomUUID()}` : `viewer:${crypto.randomUUID()}`;
    const viewerKeyRef = { current: crypto.randomUUID() };

    let viewerPeer: PeerInstance | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;
    let helloTimer: number | null = null;

    const countViewers = (state: Record<string, unknown[]>) => {
      let n = 0;
      for (const metas of Object.values(state)) {
        const first = metas[0] as { role?: string } | undefined;
        if (first?.role === "viewer") n += 1;
      }
      setPresenceViewers(n);
    };

    async function sendBroadcast(
      ch: ReturnType<typeof supabase.channel>,
      event: string,
      payload: Record<string, unknown>,
    ) {
      const res = await ch.send({
        type: "broadcast",
        event,
        payload,
      });
      if (res !== "ok") console.warn("[LiveRoom] broadcast", event, res);
    }

    function cleanupStreams() {
      hostStreamRef.current?.getTracks().forEach((t) => t.stop());
      hostStreamRef.current = null;
    }

    function destroyAllPeers() {
      hostPeersRef.current.forEach((p) => {
        try {
          p.destroy();
        } catch {
          /* noop */
        }
      });
      hostPeersRef.current.clear();
      if (viewerPeer) {
        try {
          viewerPeer.destroy();
        } catch {
          /* noop */
        }
        viewerPeer = null;
      }
    }

    async function runHost() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current },
          audio: true,
        });
        hostStreamRef.current = stream;
      } catch {
        setError("Camera/microphone access denied or unavailable.");
        return;
      }
      if (destroyed) return;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = hostStreamRef.current;
      }

      channel = supabase.channel(liveChannelName(sessionId), {
        config: {
          broadcast: { self: true },
          presence: { key: presenceKey },
        },
      });

      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        const p = payload as SignalPayload;
        if (p.from !== "viewer") return;
        const peer = hostPeersRef.current.get(p.viewerKey);
        if (peer) {
          try {
            peer.signal(p.data);
          } catch {
            /* noop */
          }
        }
      });

      channel.on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg = payload as ChatMsg;
        if (!msg?.id || !msg.text) return;
        setChat((c) => {
          if (c.some((x) => x.id === msg.id)) return c;
          return [...c, msg].slice(-100);
        });
      });

      channel.on("broadcast", { event: "viewer-hello" }, ({ payload }) => {
        const vk = (payload as { viewerKey?: string }).viewerKey;
        const stream = hostStreamRef.current;
        if (!vk || hostPeersRef.current.has(vk) || !stream || !channel) return;

        void import("simple-peer").then(({ default: Peer }) => {
          if (destroyed || !hostStreamRef.current || !channel) return;
          const peer: PeerInstance = new Peer({
            initiator: true,
            stream: hostStreamRef.current,
            trickle: true,
            config: rtc,
          });

          hostPeersRef.current.set(vk, peer);

          peer.on("signal", (data) => {
            void sendBroadcast(channel!, "signal", {
              viewerKey: vk,
              from: "host",
              data,
            } as unknown as Record<string, unknown>);
          });

          peer.on("close", () => {
            hostPeersRef.current.delete(vk);
          });

          peer.on("error", () => {
            hostPeersRef.current.delete(vk);
          });
        });
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        countViewers(channel.presenceState() as Record<string, unknown[]>);
      });

      await channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED" || !channel || destroyed) return;
        await channel.track({ role: "host", online_at: new Date().toISOString() });
        await sendBroadcast(channel, "host-ready", {});
      });
    }

    async function runViewer() {
      channel = supabase.channel(liveChannelName(sessionId), {
        config: {
          broadcast: { self: true },
          presence: { key: presenceKey },
        },
      });

      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        const p = payload as SignalPayload;
        if (p.viewerKey !== viewerKeyRef.current || p.from !== "host") return;
        if (viewerPeer) {
          try {
            viewerPeer.signal(p.data);
          } catch {
            /* noop */
          }
        }
      });

      channel.on("broadcast", { event: "session-ended" }, () => {
        setError("Host ended the stream.");
        destroyAllPeers();
      });

      channel.on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg = payload as ChatMsg;
        if (!msg?.id || !msg.text) return;
        setChat((c) => {
          if (c.some((x) => x.id === msg.id)) return c;
          return [...c, msg].slice(-100);
        });
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        countViewers(channel.presenceState() as Record<string, unknown[]>);
      });

      const { default: Peer } = await import("simple-peer");

      await channel.subscribe(async (status) => {
        if (status !== "SUBSCRIBED" || !channel || destroyed) return;

        await supabase.rpc("live_session_viewer_delta", {
          p_session_id: sessionId,
          p_delta: 1,
        });

        await channel.track({ role: "viewer", online_at: new Date().toISOString() });

        viewerPeer = new Peer({
          initiator: false,
          trickle: true,
          config: rtc,
        });

        viewerPeer.on("stream", (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        });

        viewerPeer.on("signal", (data) => {
          void sendBroadcast(channel!, "signal", {
            viewerKey: viewerKeyRef.current,
            from: "viewer",
            data,
          } as unknown as Record<string, unknown>);
        });

        viewerPeer.on("close", () => {});
        viewerPeer.on("error", () => {});

        const sendHello = () => {
          if (destroyed || !channel) return;
          void sendBroadcast(channel, "viewer-hello", {
            viewerKey: viewerKeyRef.current,
          });
        };

        sendHello();
        let n = 0;
        helloTimer = window.setInterval(() => {
          n += 1;
          if (n > 8 || destroyed) {
            if (helloTimer) window.clearInterval(helloTimer);
            helloTimer = null;
            return;
          }
          sendHello();
        }, 1200);
      });
    }

    if (mode === "host") {
      void runHost();
    } else {
      void runViewer();
    }

    return () => {
      destroyed = true;
      if (helloTimer) window.clearInterval(helloTimer);
      destroyAllPeers();
      cleanupStreams();
      if (channel) {
        void channel.unsubscribe();
      }
      if (mode === "viewer") {
        void supabase.rpc("live_session_viewer_delta", {
          p_session_id: sessionId,
          p_delta: -1,
        });
      }
    };
  }, [mode, sessionId]);

  const sendChat = useCallback(async () => {
    const text = chatDraft.trim();
    if (!text || text.length > 500) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let msgId = crypto.randomUUID();
    const { data: inserted, error: insertErr } = await supabase
      .from("live_chat_messages")
      .insert({
        session_id: sessionId,
        incident_id: incident.id,
        user_id: user.id,
        handle: myHandle,
        body: text,
      })
      .select("id")
      .single();
    if (!insertErr && inserted && typeof inserted === "object" && "id" in inserted) {
      msgId = (inserted as { id: string }).id;
    }

    const msg: ChatMsg = {
      id: msgId,
      handle: myHandle,
      text,
      ts: Date.now(),
    };

    const ch = supabase.channel(liveChannelName(sessionId), {
      config: { broadcast: { self: false } },
    });
    await ch.subscribe();
    const chatRes = await ch.send({
      type: "broadcast",
      event: "chat",
      payload: msg as unknown as Record<string, unknown>,
    });
    if (chatRes !== "ok") console.warn("[LiveRoom] chat send", chatRes);
    setChat((c) => {
      if (c.some((x) => x.id === msg.id)) return c;
      return [...c, msg].slice(-100);
    });
    setChatDraft("");
    void ch.unsubscribe();
  }, [chatDraft, myHandle, sessionId, incident.id]);

  const flipCamera = useCallback(async () => {
    if (mode !== "host") return;
    const nextFacing =
      facingModeRef.current === "user" ? "environment" : "user";
    const current = hostStreamRef.current;
    const audioTracks = [...(current?.getAudioTracks() ?? [])];
    try {
      const vidOnly = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false,
      });
      current?.getVideoTracks().forEach((t) => t.stop());
      facingModeRef.current = nextFacing;
      const merged = new MediaStream([
        ...vidOnly.getVideoTracks(),
        ...audioTracks,
      ]);
      hostStreamRef.current = merged;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = merged;
      }
      const vt = merged.getVideoTracks()[0];
      if (vt) replaceVideoTrackOnPeers(hostPeersRef.current, vt);
    } catch {
      setError("Could not switch camera.");
    }
  }, [mode]);

  const handleEndHost = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      onLeave();
      return;
    }
    const ch = supabase.channel(liveChannelName(sessionId), {
      config: { broadcast: { self: false } },
    });
    await ch.subscribe();
    const endRes = await ch.send({
      type: "broadcast",
      event: "session-ended",
      payload: {},
    });
    if (endRes !== "ok") console.warn("[LiveRoom] session-ended", endRes);
    void ch.unsubscribe();
    await endLiveSession(supabase, sessionId, user.id);
    onLeave();
  }, [onLeave, sessionId]);

  const label = categoryLabel(incident.type);
  const accent = categoryColor(incident.type);

  return (
    <div className="fixed inset-0 z-[60] flex touch-manipulation flex-col overscroll-none bg-background">
      <div className="relative flex min-h-0 flex-1 flex-col bg-black">
        {mode === "host" ? (
          <video
            ref={localVideoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <video
            ref={remoteVideoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
          />
        )}

        <div
          className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: `${accent}cc` }}
            >
              {label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-xs font-bold text-white">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              LIVE
            </span>
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              {presenceViewers} watching
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute right-2 top-2 flex gap-2">
          {mode === "host" ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="pointer-events-auto shadow-md"
              onClick={() => void flipCamera()}
              aria-label="Flip camera"
              title="Front / back camera"
            >
              <SwitchCamera className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="pointer-events-auto shadow-md"
            onClick={() => {
              if (mode === "host") void handleEndHost();
              else onLeave();
            }}
            aria-label={mode === "host" ? "End stream" : "Leave"}
          >
            <X className="size-4" />
          </Button>
        </div>

        {error ? (
          <div className="absolute inset-x-4 top-20 rounded-lg border border-destructive/50 bg-destructive/20 px-3 py-2 text-center text-sm text-white">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex max-h-[40vh] min-h-[140px] flex-col border-t border-border bg-card">
        <div className="max-h-[min(28vh,200px)] space-y-1 overflow-y-auto p-2 text-xs">
          {chat.length === 0 ? (
            <p className="px-1 text-muted-foreground">Chat (saved to this incident)</p>
          ) : (
            chat.map((m) => (
              <div key={m.id} className="rounded-md bg-muted/40 px-2 py-1">
                <span className="font-mono text-[0.65rem] text-muted-foreground">
                  {m.handle}
                </span>
                <p className="text-foreground">{m.text}</p>
              </div>
            ))
          )}
        </div>
        <form
          className="flex gap-2 border-t border-border/60 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendChat();
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Message…"
            value={chatDraft}
            maxLength={500}
            onChange={(e) => setChatDraft(e.target.value)}
          />
          <Button type="submit" size="sm" className="gap-1 shrink-0">
            <Send className="size-3.5" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
