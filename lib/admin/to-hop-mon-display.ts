import type { AdminToHopMonRow } from "@/lib/admin/to-hop-mon-server";

/** Các khối thi (`edu_to_hop_mon`) có slot gắn môn này. */
export function khoiThiContainingMonId(
  khoiRows: AdminToHopMonRow[],
  monId: string | null | undefined,
): AdminToHopMonRow[] {
  const id = monId?.trim();
  if (!id) return [];
  return khoiRows.filter((k) =>
    k.chi_tiet.some((slot) => slot.id_mon_thi === id),
  );
}

export function formatKhoiThiChip(row: AdminToHopMonRow): string {
  return row.ma_to_hop;
}
