import { layNoiBoDangBaiSecret, laySiteUrl } from "./env.mjs";

/**
 * Gọi POST /api/noi-bo/tac-pham/dang trên site (local hoặc prod).
 */
export async function goiApiDangBai(body) {
  const secret = layNoiBoDangBaiSecret();
  if (!secret) {
    throw new Error("Thiếu CINS_NOI_BO_DANG_BAI_SECRET");
  }
  const base = laySiteUrl();
  const res = await fetch(`${base}/api/noi-bo/tac-pham/dang`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
