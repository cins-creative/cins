import { Loader2 } from "lucide-react";

import "@/components/shop/shop-dashboard.css";

export default function BanHangLoading() {
  return (
    <div className="shop-dash-loading" aria-busy="true">
      <Loader2 size={20} className="shop-spin" aria-hidden />
      Đang tải…
    </div>
  );
}
