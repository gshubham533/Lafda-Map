import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentHistorySection } from "@/components/incident/incident-history-section";
import { IncidentMediaSection } from "@/components/incident/incident-media-section";
import { IncidentPageLive } from "@/components/incident/incident-page-live";
import { buttonVariants } from "@/components/ui/button-variants";
import { getIncidentById } from "@/lib/get-incident";
import { getIncidentMediaForIncident } from "@/lib/get-incident-media";
import { getPublicSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type PageProps = { params: { id: string } };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const incident = await getIncidentById(params.id);
  if (!incident) {
    return { title: "Incident | LafdaMap" };
  }
  const base = getPublicSiteUrl();
  const url = `${base}/incident/${incident.id}`;
  const description =
    incident.description?.trim().slice(0, 160) ||
    `${incident.title} on LafdaMap`;
  return {
    title: `${incident.title} | LafdaMap`,
    description,
    openGraph: {
      title: incident.title,
      description,
      url,
      siteName: "LafdaMap",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary",
      title: incident.title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function IncidentPage({ params }: PageProps) {
  const incident = await getIncidentById(params.id);
  if (!incident) notFound();

  const incidentMedia = await getIncidentMediaForIncident(incident.id);

  return (
    <main className="min-h-dvh bg-background px-4 pb-10 pt-6 text-foreground">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex",
            )}
          >
            ← Map
          </Link>
          <Link
            href="/events"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground",
            )}
          >
            All events
          </Link>
        </div>
        <IncidentPageLive incident={incident} />
        <IncidentMediaSection
          incidentId={incident.id}
          reporterUserId={incident.user_id}
          initialMedia={incidentMedia}
        />
        <IncidentHistorySection incidentId={incident.id} />
      </div>
    </main>
  );
}
