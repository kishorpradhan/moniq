import { redirect } from "next/navigation";

export default function DemoChatPage() {
  redirect("/demo?tab=chat");
}
