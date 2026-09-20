import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { snapshot } from "@/lib/snapshot";
import StudyApp from "@/components/study-app";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (
    section &&
    (section.length > 1 ||
      !["library", "notes", "mistakes", "plan", "settings", "roadmap"].includes(
        section[0],
      ))
  )
    notFound();
  if (!(await currentUser())) redirect("/login");
  return <StudyApp initial={await snapshot()} />;
}
