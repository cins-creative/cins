import Link from "next/link";

import { MoShopForm } from "@/components/shop/MoShopForm";
import { renderAdminPage } from "@/lib/admin/admin-page";

import "@/app/open-shop/mo-shop.css";
import "../mo-shop-admin.css";

export const dynamic = "force-dynamic";

export default function AdminMoShopFormPage() {
  return renderAdminPage(
    <div className="mo-shop-admin">
      <header className="mo-shop-admin-head">
        <div>
          <p className="mo-shop-admin-kicker">
            <Link href="/admin/mo-shop">← Danh sách lead</Link>
          </p>
          <h1 className="mo-shop-admin-title">Form nhập mở shop</h1>
          <p className="mo-shop-admin-sub">
            Điền hộ lead tại đây, hoặc gửi link public{" "}
            <Link href="/mo-shop" target="_blank" rel="noopener noreferrer">
              /mo-shop
            </Link>
            .
          </p>
        </div>
      </header>
      <div className="mo-shop-admin-form-wrap">
        <MoShopForm initialGt="" initialTu="admin" />
      </div>
    </div>,
  );
}
