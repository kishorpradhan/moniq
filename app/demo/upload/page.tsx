import { redirect } from "next/navigation";

export default function DemoUploadPage() {
  redirect("/demo?tab=data");
}
