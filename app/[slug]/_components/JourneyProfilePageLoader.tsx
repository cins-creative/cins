import { notFound, redirect } from "next/navigation";

import { JourneyProfileShell } from "@/app/[slug]/_components/JourneyProfileShell";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import type { JourneyProfileView } from "@/components/journey/JourneySidebar";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  normalizeLoaiMocVisibility,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import {
  journeyDefaultViewHref,
  normalizeJourneyDefaultView,
} from "@/lib/journey/journey-default-view";
import { parseComposeSearchParams } from "@/lib/journey/compose-types";
import {
  getAvatarUrl,
  getProfileCoverUrl,
  normalizeSocialLinks,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import { getQuanHeDetail } from "@/lib/social/ket-ban";
import type { KetBanStatusSummary } from "@/lib/social/types";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{
  welcome?: string;
  /** `journey` | `gallery` | `friends` | `organizations` — thiếu = bare entry. */
  view?: string;
  compose?: string;
  edit?: string;
}>;

export async function JourneyProfilePageLoader({
  params,
  searchParams,
  /** Trang `/{slug}/shop` — không redirect vòng, ép view shop. */
  storefront = false,
  /** Trang `/{slug}/shop/loai/[nhomId]` — panel chính = chi tiết loại. */
  shopNhomId = null,
}: {
  params: Params;
  searchParams: SearchParams;
  storefront?: boolean;
  shopNhomId?: string | null;
}) {
  const { slug } = await params;
  const { welcome, view, compose, edit } = await searchParams;

  const [{ owner, error }, session] = await Promise.all([
    fetchOwnerBySlug(slug),
    getCurrentSessionAndProfile(),
  ]);

  if (error || !owner) {
    notFound();
  }

  const isOwner = session ? owner.auth_user_id === session.authUserId : false;

  if (isOwner && owner.giai_doan === null) {
    redirect("/onboarding");
  }

  if (!isOwner && owner.giai_doan === null) {
    notFound();
  }

  // Chỉ áp chế độ mặc định khi vào bare `/{slug}` (chưa có ?view=) — tức lần
  // đến từ trang khác / link hồ sơ. Khi user đã chọn Journey (`?view=journey`)
  // hoặc Gallery / Friends… thì giữ nguyên qua F5 và các action (like, comment).
  // Mặc định chỉ áp cho khách; áp cho chính chủ khi bật "Áp dụng cho tôi".
  if (
    !storefront &&
    view === undefined &&
    (!isOwner || owner.journey_mac_dinh_ap_dung_toi)
  ) {
    const defaultView = normalizeJourneyDefaultView(owner.journey_mac_dinh_view);
    if (defaultView !== "timeline") {
      redirect(journeyDefaultViewHref(slug, defaultView));
    }
  }

  const viewerProfileId = session?.profile?.id ?? null;

  const initialKetBanStatusPromise: Promise<KetBanStatusSummary | null> =
    viewerProfileId && !isOwner
      ? getQuanHeDetail(viewerProfileId, owner.id).then((detail) => ({
          trang_thai: detail.trangThai,
          ket_ban_id: detail.ketBanId,
        }))
      : Promise.resolve(null);

  const emailPublic = owner.visibility_email === "public";
  const emailForView = isOwner || emailPublic ? owner.email_lien_he : null;

  const banHangBat = owner.ban_hang_bat === true;
  const shopHienThi = owner.shop_hien_thi === true;
  /* Chủ xem trước khi công khai; khách chỉ thấy khi bật «Hiển thị shop». */
  const showShop = banHangBat && (isOwner || shopHienThi);

  if (storefront) {
    if (!showShop) notFound();
  } else if (view === "shop") {
    /* Legacy `?view=shop` → path storefront. */
    redirect(`/${encodeURIComponent(slug)}/shop`);
  }

  const activeView: JourneyProfileView = storefront
    ? "shop"
    : view === "gallery" ||
        view === "friends" ||
        view === "organizations" ||
        view === "journey"
      ? (view as JourneyProfileView)
      : "journey";

  const filterVisibility: LoaiMocVisibilityMap = normalizeLoaiMocVisibility(
    owner.journey_loai_moc_visibility,
  );

  const editProfileInitial: EditProfileInitial | undefined = isOwner
    ? {
        tenHienThi: owner.ten_hien_thi ?? "",
        bio: owner.bio ?? "",
        tinhThanh: owner.tinh_thanh ?? "",
        emailLienHe: owner.email_lien_he ?? session?.email ?? "",
        visibilityEmail: emailPublic ? "public" : "private",
        mxhLinks: normalizeSocialLinks(owner.mxh_links).map((l) => ({
          label: l.label,
          url: l.url,
        })),
        giaiDoan: owner.giai_doan ?? "moi_bat_dau",
      }
    : undefined;

  void welcome;

  const ownerName = owner.ten_hien_thi || `@${slug}`;
  const ownerAvatarUrl = getAvatarUrl(owner.avatar_id);

  const initialCompose = isOwner
    ? parseComposeSearchParams(
        (() => {
          const params = new URLSearchParams();
          if (compose) params.set("compose", compose);
          if (edit) params.set("edit", edit);
          return params;
        })(),
      )
    : null;

  const initialKetBanStatus = await initialKetBanStatusPromise;

  return (
    <div className="cins-journey-page">
      <JourneyProfileShell
        activeView={activeView}
        owner={owner}
        ownerAvatarUrl={ownerAvatarUrl}
        ownerCoverUrl={getProfileCoverUrl(owner.cover_id)}
        emailForView={emailForView}
        ownerName={ownerName}
        isOwner={isOwner}
        viewerProfileId={viewerProfileId}
        initialKetBanStatus={initialKetBanStatus}
        filterVisibility={filterVisibility}
        editProfileInitial={editProfileInitial}
        initialCompose={initialCompose}
        showShop={showShop}
        shopNhomId={shopNhomId}
      />
    </div>
  );
}
