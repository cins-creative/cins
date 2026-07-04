import { redirect } from "next/navigation";

/** Legacy URL `/luoi` → `/?display=luoi` (cùng trang chủ, chế độ lưới). */
export default function HomeGridRedirectPage() {
  redirect("/?display=luoi");
}
