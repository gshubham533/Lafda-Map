import {
  getChatMessagesForIncident,
  getLiveSessionsForIncident,
} from "@/lib/get-incident-history";
import { formatRelativeTime } from "@/lib/relative-time";

export async function IncidentHistorySection({
  incidentId,
}: {
  incidentId: string;
}) {
  const [sessions, messages] = await Promise.all([
    getLiveSessionsForIncident(incidentId),
    getChatMessagesForIncident(incidentId),
  ]);

  if (sessions.length === 0 && messages.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-8 border-t border-border pt-8">
      <h2 className="text-lg font-semibold tracking-tight">Live history</h2>
      <p className="text-xs text-muted-foreground">
        Public log of streams and chat messages tied to this pin.
      </p>

      {sessions.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Sessions</h3>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Started</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Viewers (last)</th>
                  <th className="px-2 py-2 font-medium">Peak</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 last:border-0">
                    <td className="px-2 py-2 align-top">
                      {formatRelativeTime(s.created_at)}
                    </td>
                    <td className="px-2 py-2">
                      {s.is_active ? (
                        <span className="text-destructive">Live</span>
                      ) : (
                        <span className="text-muted-foreground">Ended</span>
                      )}
                    </td>
                    <td className="px-2 py-2">{s.viewer_count}</td>
                    <td className="px-2 py-2">{s.peak_viewers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {messages.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Chat log</h3>
          <ul className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-2 text-xs">
            {messages.map((m) => (
              <li key={m.id} className="rounded-md bg-background/80 px-2 py-1.5">
                <span className="font-mono text-[0.65rem] text-muted-foreground">
                  {m.handle}
                </span>
                <span className="mx-1.5 text-border">·</span>
                <span className="text-[0.65rem] text-muted-foreground">
                  {formatRelativeTime(m.created_at)}
                </span>
                <p className="mt-0.5 text-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
