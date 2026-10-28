import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/physicians";

export const metadata: Metadata = {
  title: "Physician Financial Planning | Elite Physicians",
  description:
    "Find coordinated financial planning for physicians at every career stage, from residency through practice ownership and retirement.",
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
