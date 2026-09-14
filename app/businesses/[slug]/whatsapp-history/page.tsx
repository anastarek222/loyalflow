import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyWhatsAppHistoryRedirect({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => next.append(key, entry));
    } else if (typeof value === "string") {
      next.set(key, value);
    }
  }

  const suffix = next.toString();
  redirect(`/businesses/${slug}/messages${suffix ? `?${suffix}` : ""}`);
}
