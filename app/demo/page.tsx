import DemoWorkspace from "@/components/DemoWorkspace";
import PublicShell from "@/components/PublicShell";

function parseTab(value: string | string[] | undefined): "analyze" | "data" {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "data") return "data";
  return "analyze";
}

export default function DemoPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] };
}) {
  return (
    <PublicShell>
      <DemoWorkspace initialTab={parseTab(searchParams?.tab)} />
    </PublicShell>
  );
}
