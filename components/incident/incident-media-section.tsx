"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthUserId } from "@/hooks/use-auth-user-id";
import { createClient } from "@/lib/supabase/client";
import type { IncidentMediaRow } from "@/lib/get-incident-media";

const BUCKET = "incident-media";

function publicUrlForPath(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function extFromMime(mime: string): string {
  const base = mime.split(";")[0]?.trim() ?? mime;
  if (base === "image/jpeg") return "jpg";
  if (base === "image/png") return "png";
  if (base === "image/webp") return "webp";
  if (base === "image/gif") return "gif";
  if (base === "video/mp4") return "mp4";
  if (base === "video/webm") return "webm";
  if (base === "video/quicktime") return "mov";
  return "bin";
}

function kindFromMime(mime: string): IncidentMediaRow["kind"] {
  const base = mime.split(";")[0]?.trim() ?? mime;
  if (base.startsWith("video/")) return "video";
  if (base.startsWith("image/")) return "image";
  return "recording";
}

export function IncidentMediaSection({
  incidentId,
  reporterUserId,
  initialMedia,
}: {
  incidentId: string;
  reporterUserId: string | null;
  initialMedia: IncidentMediaRow[];
}) {
  const router = useRouter();
  const currentUserId = useAuthUserId();
  const [items, setItems] = useState(initialMedia);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setItems(initialMedia);
  }, [initialMedia]);

  const isReporter =
    !!reporterUserId &&
    !!currentUserId &&
    reporterUserId === currentUserId;

  const uploadBlob = useCallback(
    async (blob: Blob, mime: string, kind: IncidentMediaRow["kind"]) => {
      setUploadError(null);
      setBusy(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUploadError("Sign in to upload.");
          return;
        }
        const ext = extFromMime(mime);
        const path = `${user.id}/${incidentId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: mime.split(";")[0]?.trim() ?? mime, upsert: false });
        if (upErr) {
          setUploadError(upErr.message);
          return;
        }
        const { data: row, error: insErr } = await supabase
          .from("incident_media")
          .insert({
            incident_id: incidentId,
            user_id: user.id,
            storage_path: path,
            mime_type: mime.split(";")[0]?.trim() ?? mime,
            kind,
          })
          .select(
            "id, incident_id, user_id, storage_path, mime_type, kind, created_at",
          )
          .single();
        if (insErr || !row) {
          setUploadError(insErr?.message ?? "Could not save metadata.");
          return;
        }
        setItems((prev) => [row as IncidentMediaRow, ...prev]);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [incidentId, router],
  );

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !isReporter) return;
      const mime = file.type || "application/octet-stream";
      if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
        setUploadError("Choose an image or video file.");
        return;
      }
      await uploadBlob(file, mime, kindFromMime(mime));
    },
    [isReporter, uploadBlob],
  );

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (!isReporter || busy || recording) return;
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType.split(";")[0] || "video/webm",
        });
        chunksRef.current = [];
        const outMime = blob.type || "video/webm";
        await uploadBlob(blob, outMime, "recording");
      };
      setRecording(true);
      rec.start(200);
    } catch (err) {
      setRecording(false);
      setUploadError(
        err instanceof Error ? err.message : "Could not access camera/mic.",
      );
    }
  }, [isReporter, busy, recording, uploadBlob]);

  return (
    <section className="mt-8 space-y-4 border-t border-border pt-8">
      <h2 className="text-lg font-semibold tracking-tight">Photos & videos</h2>
      <p className="text-xs text-muted-foreground">
        Files are stored in the incident-media bucket. Only the reporter can add
        media for this pin.
      </p>

      {isReporter ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || recording}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload image or video"}
          </Button>
          {recording ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              Stop & upload
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void startRecording()}
            >
              Record clip
            </Button>
          )}
        </div>
      ) : null}

      {uploadError ? (
        <p className="text-xs text-destructive">{uploadError}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((m) => (
            <li
              key={m.id}
              className="overflow-hidden rounded-lg border border-border/60 bg-muted/20"
            >
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase public URL
                <img
                  src={publicUrlForPath(m.storage_path)}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <video
                  src={publicUrlForPath(m.storage_path)}
                  controls
                  playsInline
                  className="aspect-square w-full object-cover"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
