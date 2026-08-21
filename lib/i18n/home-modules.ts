import type { ModuleMeta } from "@/lib/cins/home-adaptive/module-meta";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import type { PresetId } from "@/lib/cins/home-adaptive/presets";
import type { MessageKey } from "@/lib/i18n/messages";
import type { TFn } from "@/lib/i18n/t";
import type { ChatMuaBanSub, ChatThreadView } from "@/lib/chat/types";
import type { LoaiSuKien } from "@/lib/to-chuc/su-kien-constants";

const MOD_LABEL: Record<ModuleId, MessageKey> = {
  theo_doi_org: "home.mod.theo_doi_org",
  goi_y_theo_doi: "home.mod.goi_y_theo_doi",
  goi_y_studio: "home.mod.goi_y_studio",
  kham_pha_linh_vuc: "home.mod.kham_pha_linh_vuc",
  duong_toi_do: "home.mod.duong_toi_do",
  khoa_hoc_goi_y: "home.mod.khoa_hoc_goi_y",
  lop_hoc_cua_ban: "home.mod.lop_hoc_cua_ban",
  ho_so_cua_ban: "home.mod.ho_so_cua_ban",
  nguoi_cung_nganh: "home.mod.nguoi_cung_nganh",
  co_hoi: "home.mod.co_hoi",
  cho_ban_duyet: "home.mod.cho_ban_duyet",
  hoc_vien_cua_ban: "home.mod.hoc_vien_cua_ban",
  scout_tai_nang: "home.mod.scout_tai_nang",
  don_can_xu_ly: "home.mod.don_can_xu_ly",
  don_mua_cua_toi: "home.mod.don_mua_cua_toi",
  quay_cua_toi: "home.mod.quay_cua_toi",
  quan_ly_kho: "home.mod.quan_ly_kho",
  gio_hang_cua_ban: "home.mod.gio_hang_cua_ban",
  org_inbox: "home.mod.org_inbox",
  quan_ly_su_kien: "home.mod.quan_ly_su_kien",
  ung_vien_moi: "home.mod.ung_vien_moi",
  to_chuc_cua_ban: "home.mod.to_chuc_cua_ban",
  ung_tuyen_cua_toi: "home.mod.ung_tuyen_cua_toi",
  tin_nhan_ban_be: "home.mod.tin_nhan_ban_be",
  tin_nhan_to_chuc: "home.mod.tin_nhan_to_chuc",
  tin_nhan_mua_ban: "home.mod.tin_nhan_mua_ban",
  loi_moi_ket_ban: "home.mod.loi_moi_ket_ban",
  se_tham_gia: "home.mod.se_tham_gia",
  da_luu: "home.mod.da_luu",
  hang_feature: "home.mod.hang_feature",
};

const MOD_DESC: Record<ModuleId, MessageKey> = {
  theo_doi_org: "home.mod.theo_doi_org.desc",
  goi_y_theo_doi: "home.mod.goi_y_theo_doi.desc",
  goi_y_studio: "home.mod.goi_y_studio.desc",
  kham_pha_linh_vuc: "home.mod.kham_pha_linh_vuc.desc",
  duong_toi_do: "home.mod.duong_toi_do.desc",
  khoa_hoc_goi_y: "home.mod.khoa_hoc_goi_y.desc",
  lop_hoc_cua_ban: "home.mod.lop_hoc_cua_ban.desc",
  ho_so_cua_ban: "home.mod.ho_so_cua_ban.desc",
  nguoi_cung_nganh: "home.mod.nguoi_cung_nganh.desc",
  co_hoi: "home.mod.co_hoi.desc",
  cho_ban_duyet: "home.mod.cho_ban_duyet.desc",
  hoc_vien_cua_ban: "home.mod.hoc_vien_cua_ban.desc",
  scout_tai_nang: "home.mod.scout_tai_nang.desc",
  don_can_xu_ly: "home.mod.don_can_xu_ly.desc",
  don_mua_cua_toi: "home.mod.don_mua_cua_toi.desc",
  quay_cua_toi: "home.mod.quay_cua_toi.desc",
  quan_ly_kho: "home.mod.quan_ly_kho.desc",
  gio_hang_cua_ban: "home.mod.gio_hang_cua_ban.desc",
  org_inbox: "home.mod.org_inbox.desc",
  quan_ly_su_kien: "home.mod.quan_ly_su_kien.desc",
  ung_vien_moi: "home.mod.ung_vien_moi.desc",
  to_chuc_cua_ban: "home.mod.to_chuc_cua_ban.desc",
  ung_tuyen_cua_toi: "home.mod.ung_tuyen_cua_toi.desc",
  tin_nhan_ban_be: "home.mod.tin_nhan_ban_be.desc",
  tin_nhan_to_chuc: "home.mod.tin_nhan_to_chuc.desc",
  tin_nhan_mua_ban: "home.mod.tin_nhan_mua_ban.desc",
  loi_moi_ket_ban: "home.mod.loi_moi_ket_ban.desc",
  se_tham_gia: "home.mod.se_tham_gia.desc",
  da_luu: "home.mod.da_luu.desc",
  hang_feature: "home.mod.hang_feature.desc",
};

const GROUP_LABEL: Record<ModuleMeta["group"], MessageKey> = {
  dang_hoc: "home.group.dang_hoc",
  freelance: "home.group.freelance",
  dang_lam: "home.group.dang_lam",
  dang_day: "home.group.dang_day",
  shop: "home.group.shop",
  chung: "home.group.chung",
};

const PRESET_LABEL: Record<PresetId, MessageKey> = {
  hoc_vien: "home.preset.hoc_vien",
  kham_pha: "home.preset.kham_pha",
  di_lam: "home.preset.di_lam",
  freelancer: "home.preset.freelancer",
  chu_shop: "home.preset.chu_shop",
  nguoi_mua: "home.preset.nguoi_mua",
  giao_vien: "home.preset.giao_vien",
  van_hanh_to_chuc: "home.preset.van_hanh_to_chuc",
  ket_noi: "home.preset.ket_noi",
  mua_hang_su_kien: "home.preset.mua_hang_su_kien",
  hoc_tap: "home.preset.hoc_tap",
};

const PRESET_FOR: Record<PresetId, MessageKey> = {
  hoc_vien: "home.preset.hoc_vien.for",
  kham_pha: "home.preset.kham_pha.for",
  di_lam: "home.preset.di_lam.for",
  freelancer: "home.preset.freelancer.for",
  chu_shop: "home.preset.chu_shop.for",
  nguoi_mua: "home.preset.nguoi_mua.for",
  giao_vien: "home.preset.giao_vien.for",
  van_hanh_to_chuc: "home.preset.van_hanh_to_chuc.for",
  ket_noi: "home.preset.ket_noi.for",
  mua_hang_su_kien: "home.preset.mua_hang_su_kien.for",
  hoc_tap: "home.preset.hoc_tap.for",
};

const EVENT_LOAI: Record<LoaiSuKien, MessageKey> = {
  workshop: "event.loai.workshop",
  talkshow: "event.loai.talkshow",
  trien_lam: "event.loai.trien_lam",
  le_hoi: "event.loai.le_hoi",
  contest: "event.loai.contest",
  meetup: "event.loai.meetup",
  khoa_dao_tao_ngan: "event.loai.khoa_dao_tao_ngan",
  tour_cong_ty: "event.loai.tour_cong_ty",
  tour_truong: "event.loai.tour_truong",
  open_day: "event.loai.open_day",
  screening: "event.loai.screening",
  hackathon: "event.loai.hackathon",
  career_fair: "event.loai.career_fair",
};

export function tHomeModLabel(t: TFn, id: ModuleId): string {
  return t(MOD_LABEL[id]);
}

export function tHomeModDesc(t: TFn, id: ModuleId): string {
  return t(MOD_DESC[id]);
}

export function tHomeGroupLabel(t: TFn, group: ModuleMeta["group"]): string {
  return t(GROUP_LABEL[group]);
}

export function tHomePresetLabel(t: TFn, id: PresetId): string {
  return t(PRESET_LABEL[id]);
}

export function tHomePresetFor(t: TFn, id: PresetId): string {
  return t(PRESET_FOR[id]);
}

export function tEventLoai(t: TFn, loai: string | null | undefined): string {
  if (loai && loai in EVENT_LOAI) return t(EVENT_LOAI[loai as LoaiSuKien]);
  return t("event.loai.fallback");
}

export function tOrgLoai(t: TFn, loai: string | null | undefined): string {
  switch (loai) {
    case "truong_dai_hoc":
      return t("org.loai.truong");
    case "co_so_dao_tao":
      return t("org.loai.csdt");
    case "studio":
    case "doanh_nghiep":
      return t("org.loai.studio");
    case "cong_dong":
      return t("org.loai.community");
    default:
      return t("org.loai.org");
  }
}

const CHAT_VIEW: Record<ChatThreadView, MessageKey> = {
  ban_be: "chat.tab.ban_be",
  nguoi_la: "chat.tab.nguoi_la",
  to_chuc: "chat.tab.to_chuc",
  mua_ban: "chat.tab.mua_ban",
};

const CHAT_MUA_BAN: Record<ChatMuaBanSub, MessageKey> = {
  mua_hang: "chat.sub.mua_hang",
  khach_hang: "chat.sub.khach_hang",
};

export function tChatView(t: TFn, view: ChatThreadView): string {
  return t(CHAT_VIEW[view]);
}

export function tChatMuaBanSub(t: TFn, sub: ChatMuaBanSub): string {
  return t(CHAT_MUA_BAN[sub]);
}

const CHAT_SIDE: Record<
  "pin" | "mocs" | "canvas" | "hoc_vien",
  MessageKey
> = {
  pin: "chat.side.pin",
  mocs: "chat.side.mocs",
  canvas: "chat.side.canvas",
  hoc_vien: "chat.side.students",
};

export function tChatSide(
  t: TFn,
  panel: "pin" | "mocs" | "canvas" | "hoc_vien",
): string {
  return t(CHAT_SIDE[panel]);
}
