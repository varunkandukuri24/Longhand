import { redirect } from "next/navigation";

/** Legacy path; signed-in home is a fresh page at `/`. */
export default function DashboardPage() {
  redirect("/");
}
