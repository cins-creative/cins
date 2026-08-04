import "server-only";

import { listLinhVucForHub } from "@/lib/career/queries";
import { loadCoHoiForHome } from "@/lib/cins/home-adaptive/co-hoi";
import {
  loadChoBanDuyet,
  loadHocVienCuaBan,
  loadKhoaHocGoiY,
  loadLopHocCuaBan,
  loadScoutTaiNang,
} from "@/lib/cins/home-adaptive/fetches";
import { loadHangFeature } from "@/lib/cins/home-adaptive/hang-feature";
import { isModuleId } from "@/lib/cins/home-adaptive/layout-prefs";
import type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";
import type { GiaiDoan, ModuleId } from "@/lib/cins/home-adaptive/persona";
import { loadProfileCompleteness } from "@/lib/cins/home-adaptive/profile-completeness";
import {
  loadDaLuu,
  loadDonCanXuLy,
  loadDonMuaCuaToi,
  loadLoiMoiKetBan,
  loadOrgInboxHome,
  loadQuayCuaToiHome,
  loadSeThamGia,
  loadSuKienQuanLyTongQuan,
  loadToChucCuaBan,
  loadUngTuyenCuaToi,
  loadUngVienMoi,
} from "@/lib/cins/home-adaptive/role-fetches";
import { loadSidebarUpcomingEvents } from "@/lib/cins/home-adaptive/sidebar-upcoming-events";
import {
  CO_SO_DAO_TAO_LOAI,
  loadFollowSuggestions,
  loadOrgFollowSuggestions,
} from "@/lib/cins/home-adaptive/suggestions";
import { mapLinhVucForGuestAside } from "@/lib/cins/worldJourneyGuestAside";

export type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";

export type ModulePreviewCtx = {
  viewerId: string;
  viewerSlug: string;
  giaiDoan: GiaiDoan | null;
  seeking: boolean;
  /** Số dòng preview (1–10). Catalog mặc định 3. */
  limit?: number;
};

export async function loadModulePreview(
  id: ModuleId,
  ctx: ModulePreviewCtx,
): Promise<ModulePreviewPayload> {
  const LIMIT = Math.min(10, Math.max(1, Math.round(ctx.limit ?? 3)));
  switch (id) {
    case "theo_doi_org": {
      const { allItems, myItems, myEventsTotal } =
        await loadSidebarUpcomingEvents(ctx.viewerId, [], LIMIT);
      if (allItems.length === 0 && myItems.length === 0) {
        return { id, empty: true };
      }
      return {
        id,
        empty: false,
        allItems,
        myItems,
        myEventsTotal,
      };
    }
    case "goi_y_theo_doi":
    case "nguoi_cung_nganh": {
      const people = await loadFollowSuggestions(ctx.viewerId, LIMIT);
      if (people.length === 0) return { id, empty: true };
      return { id, empty: false, people };
    }
    case "goi_y_studio": {
      const orgs = await loadOrgFollowSuggestions(ctx.viewerId, LIMIT, {
        loaiToChuc: ["studio", "doanh_nghiep"],
      });
      if (orgs.length === 0) return { id, empty: true };
      return { id, empty: false, orgs };
    }
    case "duong_toi_do": {
      const orgs = await loadOrgFollowSuggestions(ctx.viewerId, LIMIT, {
        loaiToChuc: CO_SO_DAO_TAO_LOAI,
      });
      if (orgs.length === 0) return { id, empty: true };
      return { id, empty: false, orgs };
    }
    case "kham_pha_linh_vuc": {
      // Khớp block home: tối đa 6 dòng ha-cat.
      const linhVucs = mapLinhVucForGuestAside(await listLinhVucForHub()).slice(
        0,
        6,
      );
      if (linhVucs.length === 0) return { id, empty: true };
      return { id, empty: false, linhVucs };
    }
    case "khoa_hoc_goi_y": {
      const courses = await loadKhoaHocGoiY(LIMIT);
      if (courses.length === 0) return { id, empty: true };
      return { id, empty: false, courses };
    }
    case "lop_hoc_cua_ban": {
      const items = await loadLopHocCuaBan(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((lop) => ({
          key: lop.lopId,
          title: lop.maLop,
          sub: [lop.next.label, lop.tenKhoa, lop.orgTen]
            .filter(Boolean)
            .join(" · "),
          avatarUrl: null,
        })),
        badge:
          items.filter((l) => l.next.isSoon).length > 0
            ? String(items.filter((l) => l.next.isSoon).length)
            : undefined,
      };
    }
    case "ho_so_cua_ban": {
      const { percent, missing } = await loadProfileCompleteness(ctx.viewerId);
      return {
        id,
        empty: false,
        percent,
        missing,
        seeking: ctx.seeking,
        viewerSlug: ctx.viewerSlug,
      };
    }
    case "co_hoi": {
      const jobs = await loadCoHoiForHome(ctx.giaiDoan, LIMIT);
      if (jobs.length === 0) return { id, empty: true };
      return { id, empty: false, jobs };
    }
    case "cho_ban_duyet": {
      const items = await loadChoBanDuyet(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items };
    }
    case "hoc_vien_cua_ban": {
      const items = await loadHocVienCuaBan(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items };
    }
    case "scout_tai_nang": {
      const items = await loadScoutTaiNang(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items };
    }
    case "don_can_xu_ly": {
      const { items } = await loadDonCanXuLy(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items: items.slice(0, LIMIT) };
    }
    case "don_mua_cua_toi": {
      const { items } = await loadDonMuaCuaToi(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items: items.slice(0, LIMIT) };
    }
    case "quay_cua_toi": {
      const items = await loadQuayCuaToiHome(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((q) => ({
          key: q.id,
          title: q.suKienTen,
          sub: [q.orgTen, q.trangThaiLabel].filter(Boolean).join(" · "),
          avatarUrl: null,
        })),
      };
    }
    case "org_inbox": {
      const items = await loadOrgInboxHome(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((t) => ({
          key: t.roomId,
          title: t.name,
          sub: [t.orgTen, t.preview].filter(Boolean).join(" · "),
          avatarUrl: t.orgAvatarUrl,
          peerAvatarUrl: t.avatarUrl,
        })),
      };
    }
    case "quan_ly_su_kien": {
      const items = await loadSuKienQuanLyTongQuan(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((sk) => {
          const slot =
            sk.slotToiDa != null
              ? `${sk.soSeThamGia}/${sk.slotToiDa}`
              : String(sk.soSeThamGia);
          return {
            key: sk.id,
            title: sk.ten,
            sub: [
              sk.batDau
                ? new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  }).format(new Date(sk.batDau))
                : null,
              `${slot} sẽ tham gia`,
              sk.soChoDuyetQuay > 0 ? `${sk.soChoDuyetQuay} quầy chờ` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            avatarUrl: null,
          };
        }),
      };
    }
    case "ung_vien_moi": {
      const items = await loadUngVienMoi(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((a) => ({
          key: a.userId + a.taoLuc,
          title: a.name,
          sub: a.jobTitle,
          avatarUrl: a.avatarUrl,
        })),
      };
    }
    case "to_chuc_cua_ban": {
      const items = await loadToChucCuaBan(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((o) => ({
          key: o.id,
          title: o.ten,
          sub: `${o.loaiLabel} · ${o.vaiTroLabel}`,
          avatarUrl: o.avatarUrl,
        })),
      };
    }
    case "ung_tuyen_cua_toi": {
      const items = await loadUngTuyenCuaToi(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((a) => ({
          key: a.jobId,
          title: a.tieuDe,
          sub: `${a.orgTen} · ${a.trangThaiLabel}`,
          avatarUrl: null,
        })),
      };
    }
    case "loi_moi_ket_ban": {
      const items = await loadLoiMoiKetBan(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((p) => ({
          key: p.userId,
          title: p.name,
          sub: "Muốn kết bạn",
          avatarUrl: p.avatarUrl,
        })),
      };
    }
    case "se_tham_gia": {
      const items = await loadSeThamGia(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((sk) => ({
          key: sk.suKienId,
          title: sk.ten,
          sub: [
            sk.batDau
              ? new Intl.DateTimeFormat("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                }).format(new Date(sk.batDau))
              : null,
            sk.orgTen,
          ]
            .filter(Boolean)
            .join(" · "),
          avatarUrl: null,
        })),
      };
    }
    case "da_luu": {
      const items = await loadDaLuu(ctx.viewerId, LIMIT);
      if (items.length === 0) return { id, empty: true };
      return {
        id,
        empty: false,
        rows: items.map((b) => ({
          key: b.id,
          title: b.title,
          sub: b.loaiLabel,
          avatarUrl: null,
        })),
      };
    }
    case "hang_feature": {
      const items = await loadHangFeature(ctx.viewerId, { limit: LIMIT });
      if (items.length === 0) return { id, empty: true };
      return { id, empty: false, items };
    }
    case "tin_nhan_ban_be":
    case "tin_nhan_to_chuc":
    case "tin_nhan_mua_ban":
      return { id, empty: true };
    default: {
      const _exhaustive: never = id;
      void _exhaustive;
      return { id: "theo_doi_org", empty: true };
    }
  }
}

export function parseModulePreviewId(raw: unknown): ModuleId | null {
  return isModuleId(raw) ? raw : null;
}
