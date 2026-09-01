"use server";

import { signOut } from "@/auth";
import { revalidatePath } from "next/cache";

export async function logoutAction() {
  // Authenticated layouts carry role-aware navigation. Invalidate the client
  // router cache before ending the session so a later account cannot reuse the
  // previous user's shell when it returns to the same route segment.
  revalidatePath("/", "layout");
  await signOut({
    redirectTo: "/login",
  });
}
