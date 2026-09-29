import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/physicians";

export const metadata: Metadata = {
  title: "Who We Help — Elite Physicians Wealth Planning™",
  description: "Planning for physicians at every career stage: residents and fellows, established physicians, practice owners and partners, and those approaching retirement.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Physicians"
      eyebrow="Planning by career stage"
    />
  );
}
