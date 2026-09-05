import { auth } from "@/auth";
import { AddBusinessExperience } from "@/components/add-business-experience";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createBusinessAction } from "../actions";

export default async function AddBusinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(currentUser?.language);

  return (
    <AddBusinessExperience
      language={language}
      createBusinessAction={createBusinessAction}
    />
  );
}
