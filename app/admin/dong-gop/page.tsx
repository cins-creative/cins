import { redirect } from "next/navigation";

export default function AdminDongGopRedirectPage() {
  redirect("/admin/bai-viet?tab=dong-gop");
}
