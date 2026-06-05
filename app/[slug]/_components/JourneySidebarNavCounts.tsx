import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";

type Props = {
  ownerSlug: string;
};

export function JourneySidebarNavCounts({ ownerSlug }: Props) {
  return <JourneySidebarSwitchNav slug={ownerSlug} />;
}
