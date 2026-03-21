import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentDetailCard } from "@/components/map/incident-detail-card";
import { buttonVariants } from "@/components/ui/button";
import { getIncidentById } from "@/lib/get-incident";
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

  return (
    <main className="min-h-dvh bg-background px-4 pb-10 pt-6 text-foreground">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 mb-4 inline-flex",
          )}
        >
          ← Map
        </Link>
        <IncidentDetailCard incident={incident} variant="page" />
      </div>
    </main>
  );
}
