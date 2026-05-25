import type { MonHocForNganhRow } from "@/lib/articles/queries";

export type MonHocCapDo = "dai_cuong" | "co_so" | "chuyen_nganh";

export type MonHocNganhWithCapDo = MonHocForNganhRow;

export type MonHocCapDoGroup = {
  cap_do: MonHocCapDo;
  title: string;
  items: MonHocNganhWithCapDo[];
};

const CAP_DO_ORDER: MonHocCapDo[] = ["dai_cuong", "co_so", "chuyen_nganh"];

const CAP_DO_LABELS: Record<MonHocCapDo, string> = {
  dai_cuong: "Môn học đại cương",
  co_so: "Môn học cơ sở",
  chuyen_nganh: "Môn học chuyên ngành",
};

function isMonHocCapDo(value: string | null | undefined): value is MonHocCapDo {
  return (
    value === "dai_cuong" || value === "co_so" || value === "chuyen_nganh"
  );
}

export function labelMonHocCapDo(capDo: MonHocCapDo): string {
  return CAP_DO_LABELS[capDo];
}

export function groupMonHocByCapDo(
  items: MonHocNganhWithCapDo[],
  options?: { includeEmptyGroups?: boolean },
): MonHocCapDoGroup[] {
  const buckets = new Map<MonHocCapDo, MonHocNganhWithCapDo[]>();
  for (const cap of CAP_DO_ORDER) {
    buckets.set(cap, []);
  }

  for (const item of items) {
    const cap = isMonHocCapDo(item.cap_do) ? item.cap_do : "co_so";
    buckets.get(cap)!.push(item);
  }

  const groups = CAP_DO_ORDER.map((cap_do) => ({
    cap_do,
    title: CAP_DO_LABELS[cap_do],
    items: buckets.get(cap_do) ?? [],
  }));

  if (options?.includeEmptyGroups) return groups;
  return groups.filter((g) => g.items.length > 0);
}

export { CAP_DO_ORDER as MON_HOC_CAP_DO_ORDER };
