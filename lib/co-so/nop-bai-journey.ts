import "server-only";

/**
 * HV đăng Journey từ bài nộp đã được GV Lưu.
 * Auto-verify org (không duyệt tay lần 2) — GV Lưu = ý chí trung tâm.
 */

import { dangBaiJourneyChoUser } from "@/lib/editor/dang-bai-journey";
import type { Block } from "@/lib/editor/types";
import { ORG_MILESTONE_TAG_KIND } from "@/lib/journey/org-milestone-tag-types";
import type { OrgMilestoneTagPayload } from "@/lib/journey/org-milestone-tag-types";
import { setDiemVerifyChoCotMoc } from "@/lib/cins/feed-scoring-write";
import { getAvatarUrl } from "@/lib/journey/profile";
import { guiTinHeThongLopBai } from "@/lib/co-so/lop-he-thong-tin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isCloudflareImageId } from "@/lib/chat/image-url";

export async function dangJourneyTuBaiNop(input: {
  nopId: string;
  viewerId: string;
  cheDo?: "public" | "chi_minh";
  tieuDe?: string;
  moTa?: string;
}): Promise<
  | { ok: true; cotMocId: string; slug: string; duongDan: string }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select(
      "id, id_hoc_vien_lop, id_bai_tap, id_media, id_tin_nhan, luu_luc, id_nguoi_luu, id_cot_moc, ghi_chu",
    )
    .eq("id", input.nopId)
    .maybeSingle();
  if (!nop) return { ok: false, error: "Không tìm thấy bài nộp." };
  if (!nop.luu_luc) {
    return { ok: false, error: "Bài chưa được giáo viên lưu." };
  }
  if (nop.id_cot_moc) {
    return { ok: false, error: "Đã đăng Journey rồi." };
  }
  if (!nop.id_media) {
    return { ok: false, error: "Bài không có ảnh để đăng." };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_nguoi_dung, id_khoa_hoc, id_lop_hoc")
    .eq("id", nop.id_hoc_vien_lop as string)
    .maybeSingle();
  if (!hvl || hvl.id_nguoi_dung !== input.viewerId) {
    return { ok: false, error: "Chỉ học viên nộp bài mới đăng được." };
  }

  const { data: media } = await admin
    .from("content_media")
    .select("id, cloudflare_id, loai_media")
    .eq("id", nop.id_media as string)
    .maybeSingle();
  if (!media?.cloudflare_id) {
    return { ok: false, error: "Không tìm thấy media." };
  }
  // Phase 6: chỉ ảnh
  if (media.loai_media === "video" || !isCloudflareImageId(media.cloudflare_id as string)) {
    return {
      ok: false,
      error: "Chỉ hỗ trợ đăng ảnh lên Journey trong giai đoạn này.",
    };
  }
  const coverId = media.cloudflare_id as string;

  const [{ data: bai }, { data: khoa }, { data: profile }] = await Promise.all([
    admin
      .from("org_bai_tap")
      .select("ten_bai_tap")
      .eq("id", nop.id_bai_tap as string)
      .maybeSingle(),
    admin
      .from("org_khoa_hoc")
      .select("id, id_to_chuc, ten_khoa_hoc")
      .eq("id", hvl.id_khoa_hoc as string)
      .maybeSingle(),
    admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .eq("id", input.viewerId)
      .maybeSingle(),
  ]);
  if (!khoa?.id_to_chuc || !profile?.slug) {
    return { ok: false, error: "Thiếu thông tin khóa / hồ sơ." };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug, loai_to_chuc, avatar_id")
    .eq("id", khoa.id_to_chuc as string)
    .maybeSingle();
  if (!org || org.loai_to_chuc !== "co_so_dao_tao") {
    return { ok: false, error: "Tổ chức không hợp lệ." };
  }

  const tenBai = (bai?.ten_bai_tap as string) || "Bài tập";
  const tenKhoa = (khoa.ten_khoa_hoc as string) || "Khóa học";
  const tieuDe =
    input.tieuDe?.trim() || `${tenBai} — ${tenKhoa}`;
  const moTa =
    input.moTa?.trim() ||
    (nop.ghi_chu as string | null)?.trim() ||
    `Bài tập «${tenBai}» tại ${org.ten}.`;

  const blocks: Block[] = [
    {
      id: "b-0",
      loai: "imgs",
      thu_tu: 0,
      config: { imgs: [coverId], layout: "1", cap: "" },
    },
    {
      id: "b-1",
      loai: "body",
      thu_tu: 1,
      config: { html: moTa },
    },
  ];

  const published = await dangBaiJourneyChoUser({
    idNguoiDung: input.viewerId,
    slugChu: profile.slug as string,
    tieuDe,
    moTa,
    coverId,
    cheDoHienThi: input.cheDo === "chi_minh" ? "chi_minh" : "public",
    loaiMoc: "hoc",
    blocks,
  });
  if (!published.ok) {
    return { ok: false, error: published.error };
  }

  const now = new Date().toISOString();
  const nam = new Date().getFullYear();

  // Gắn org + khóa + lớp + nguồn
  await admin
    .from("content_cot_moc")
    .update({
      id_to_chuc: org.id,
      id_khoa_hoc: khoa.id,
      id_lop_hoc: hvl.id_lop_hoc,
      nguon_goc: "sinh_tu_hoc_vien_lop",
      loai_moc: "hoc",
    })
    .eq("id", published.idCotMoc);

  const studentName =
    (profile.ten_hien_thi as string)?.trim() ||
    (profile.slug as string) ||
    "HV";
  const payload: OrgMilestoneTagPayload = {
    kind: ORG_MILESTONE_TAG_KIND,
    tacPhamId: published.idTacPham,
    orgLoai: "co_so_dao_tao",
    orgTen: org.ten as string,
    orgSlug: org.slug as string,
    orgAvatarUrl: getAvatarUrl((org.avatar_id as string | null) ?? null),
    nam,
    khoaHocId: khoa.id as string,
    khoaHocTen: tenKhoa,
    milestoneTitle: tieuDe,
    milestoneKind: "hoc",
    projectTitle: tenBai,
    studentName,
    studentSlug: profile.slug as string,
    studentAvatarUrl: getAvatarUrl(
      (profile.avatar_id as string | null) ?? null,
    ),
    album: {
      title: tieuDe,
      href: published.duongDan,
      excerpt: moTa,
      coverSrc: null,
      photoCount: 1,
    },
    evidence: [
      {
        label: "Bài nộp lớp",
        kind: "text",
        detail: `nopId=${nop.id}`,
      },
    ],
    hienThiSanPham: true,
  };

  const { error: yeuCauErr } = await admin.from("verify_yeu_cau").insert({
    nguoi_yeu_cau: input.viewerId,
    id_cot_moc: published.idCotMoc,
    id_to_chuc: org.id,
    noi_dung: payload,
    trang_thai: "da_duyet",
    nguoi_xu_ly: (nop.id_nguoi_luu as string | null) ?? input.viewerId,
    xu_ly_luc: now,
  });
  if (yeuCauErr) {
    return { ok: false, error: yeuCauErr.message };
  }

  await admin.from("verify_xac_nhan").insert({
    id_cot_moc: published.idCotMoc,
    loai_nguoi_xac_nhan: "to_chuc",
    id_nguoi_xac_nhan: org.id,
    trang_thai: "da_xac_nhan",
    bang_chung: {
      nguon: "nop_bai",
      nopId: nop.id,
      tinNhanId: nop.id_tin_nhan,
    },
  });

  await setDiemVerifyChoCotMoc(published.idCotMoc);

  await admin
    .from("org_nop_bai")
    .update({
      id_cot_moc: published.idCotMoc,
      dang_journey_luc: now,
      cap_nhat_luc: now,
    })
    .eq("id", nop.id);

  if (hvl.id_lop_hoc) {
    await guiTinHeThongLopBai({
      lopId: hvl.id_lop_hoc as string,
      actorId: input.viewerId,
      loai: "journey_da_dang",
      idNguoiDung: input.viewerId,
      idHocVienLop: hvl.id as string,
      idBaiTap: nop.id_bai_tap as string,
      tenBai,
      idNopBai: nop.id as string,
      idCotMoc: published.idCotMoc,
      slug: published.slugBai,
    });
  }

  return {
    ok: true,
    cotMocId: published.idCotMoc,
    slug: published.slugBai,
    duongDan: published.duongDan,
  };
}
