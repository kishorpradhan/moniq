import DemoWorkspace from "@/components/DemoWorkspace";
import PublicShell from "@/components/PublicShell";

type DemoTab = "overview" | "chat" | "data";

function parseTab(value: string | string[] | undefined): DemoTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "chat" || tab === "data" || tab === "overview") return tab;
  return "overview";
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
