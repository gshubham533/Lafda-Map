/** STUN for MVP; add TURN via env when NAT traversal fails in the field. */
export function getRtcConfiguration(): RTCConfiguration {
  const list =
    process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean) ??
    ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];
  return {
    iceServers: list.map((u) => ({ urls: u })),
  };
}
