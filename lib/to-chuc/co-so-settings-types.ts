import type { CoSoStaffVaiTro } from "./co-so-vai-tro";

export type CoSoMemberAdmin = {
  id: string;
  userId: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  vaiTro: CoSoStaffVaiTro;
  editable: boolean;
  isSelf: boolean;
};

export type CoSoSettingsViewer = {
  vaiTro: string | null;
  vaiTroLabel: string;
  isCinsAdmin: boolean;
  canManageMembers: boolean;
  canChangeSlug: boolean;
};
