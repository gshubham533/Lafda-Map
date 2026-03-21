import dynamic from "next/dynamic";

const LafdaMap = dynamic(() => import("@/components/map/lafda-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <LafdaMap />
    </main>
  );
}
