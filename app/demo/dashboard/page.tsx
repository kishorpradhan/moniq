import { redirect } from "next/navigation";

export default function DemoDashboardPage() {
  redirect("/demo?tab=analyze");
}
