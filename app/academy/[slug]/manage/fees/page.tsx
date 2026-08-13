import { redirect } from "next/navigation";

/**
 * P1: tab «Phí CINs» chuyển về hub billing user owner.
 * Giữ route + section `"phi"` trong union để link/noti cũ không 404.
 */
export default function CoSoPhiRedirectPage() {
  redirect("/account/billing");
}
