export const CO_SO_KHOA_UPDATED_EVENT = "cins-co-so-khoa-updated";

export function notifyCoSoKhoaListChanged(orgId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CO_SO_KHOA_UPDATED_EVENT, { detail: { orgId } }),
  );
}
