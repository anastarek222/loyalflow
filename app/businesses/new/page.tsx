import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AddBusinessExperience } from "@/components/add-business-experience";
import { createBusinessAction, createOwnerInvitationAction } from "../actions";

export default async function AddBusinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <AddBusinessExperience createBusinessAction={createBusinessAction} createOwnerInvitationAction={createOwnerInvitationAction} />;
}
