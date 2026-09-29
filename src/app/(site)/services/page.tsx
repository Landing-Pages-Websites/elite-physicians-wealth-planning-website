import type { Metadata } from "next";
import { FamilyIndexPage } from "@/components/pages/family-index-page";

const ROUTE = "/services";

export const metadata: Metadata = {
  title: "Services for Physicians — Elite Physicians Wealth Planning™",
  description: "Elite Physicians Wealth Planning™ is built around five planning pillars: tax strategy, retirement strategy, wealth management, practice planning, and legacy planning.",
  alternates: { canonical: ROUTE },
};

export default function Page(): React.JSX.Element {
  return (
    <FamilyIndexPage
      route={ROUTE}
      label="Services"
      eyebrow="Five planning disciplines"
    />
  );
}
