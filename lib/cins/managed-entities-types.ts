export type ManagedEntityKind =
  | "shop"
  | "co_so_dao_tao"
  | "studio"
  | "cong_dong";

export type ManagedEntity = {
  kind: ManagedEntityKind;
  id: string;
  ten: string;
  slug: string;
  avatarUrl: string | null;
  href: string;
};

export function managedEntityKindLabel(kind: ManagedEntityKind): string {
  if (kind === "shop") return "Shop";
  if (kind === "co_so_dao_tao") return "CSĐT";
  if (kind === "studio") return "Studio";
  return "Cộng đồng";
}
