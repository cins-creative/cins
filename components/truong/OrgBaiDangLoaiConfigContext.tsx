"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  SCHOOL_LOAI_CONFIG,
  type OrgBaiDangLoaiConfig,
} from "@/lib/truong/org-bai-dang-loai-options";

const OrgBaiDangLoaiConfigContext =
  createContext<OrgBaiDangLoaiConfig | null>(null);

/** Cấu hình loại bài đăng theo loại tổ chức — mặc định (null) = trường/cơ sở. */
export function useOrgBaiDangLoaiConfig(): OrgBaiDangLoaiConfig {
  return useContext(OrgBaiDangLoaiConfigContext) ?? SCHOOL_LOAI_CONFIG;
}

export function OrgBaiDangLoaiConfigProvider({
  config,
  children,
}: {
  config: OrgBaiDangLoaiConfig;
  children: ReactNode;
}) {
  return (
    <OrgBaiDangLoaiConfigContext.Provider value={config}>
      {children}
    </OrgBaiDangLoaiConfigContext.Provider>
  );
}
