"use client";

import { useCallback } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";

export const CONG_DONG_AUTH_MESSAGE =
  "Đăng nhập hoặc tạo tài khoản CINs để tham gia và tương tác với cộng đồng này.";

export function useCongDongAuthGate() {
  const { isAuthenticated, openAuthModal } = useAuthGate();

  const requireCongDongAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }
      openAuthModal(CONG_DONG_AUTH_MESSAGE);
    },
    [isAuthenticated, openAuthModal],
  );

  return { isAuthenticated, requireCongDongAuth };
}
