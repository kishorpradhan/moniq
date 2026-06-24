import DashboardExperience from "@/components/DashboardExperience";
import Shell from "@/components/Shell";
import { demoAllocation, demoPositions, demoSummary } from "@/lib/demoData";

export default function DemoDashboardPage() {
  return (
    <Shell>
      <DashboardExperience
        summary={demoSummary}
        allocation={demoAllocation}
        positions={demoPositions}
        mode="demo"
      />
    </Shell>
  );
}
