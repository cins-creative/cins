import { redirect } from "next/navigation";

/** Legacy URL `/luoi` → trang chủ (chỉ còn chế độ dòng thời gian). */
export default function HomeGridRedirectPage() {
  redirect("/");
}
