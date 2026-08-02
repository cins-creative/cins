import { OrgQuanLyPageGate } from "@/components/to-chuc/quan-ly/OrgQuanLyPageGate";
import type { CoSoQuanLySection } from "@/lib/to-chuc/co-so-routes";

type Props = {
  params: Promise<{ slug: string }>;
  section: CoSoQuanLySection;
  /** Founder-only (owner/admin) — dùng cho "Cài đặt tối cao", bỏ qua ma trận module. */
  requireFounder?: boolean;
  children: React.ReactNode;
};

/** Wrapper mỏng — logic nằm ở `OrgQuanLyPageGate`. */
export async function CoSoQuanLyPageGate({
  params,
  section,
  requireFounder = false,
  children,
}: Props) {
  return (
    <OrgQuanLyPageGate
      orgKind="co_so_dao_tao"
      params={params}
      section={section}
      requireFounder={requireFounder}
    >
      {children}
    </OrgQuanLyPageGate>
  );
}
