/**
 * Mock session for UI lab — no Supabase.
 *
 * LOGIC_TOUCH: home.session-gate
 * Real: getCurrentSessionAndProfile() in lib/auth/session.ts
 * Mock: this fixture + LabChrome toggle
 * Apply: replace with real session; remove lab toggle
 */

export type MockGiaiDoan =
  | "dang_hoc"
  | "dang_lam"
  | "tim_viec"
  | "freelance"
  | "dang_day";

export type MockPersona = "hoc" | "lam" | "day";

export type MockSession = {
  authenticated: boolean;
  profile: {
    id: string;
    slug: string;
    tenHienThi: string;
    giaiDoan: MockGiaiDoan;
  } | null;
};

export const MOCK_GUEST_SESSION: MockSession = {
  authenticated: false,
  profile: null,
};

export const MOCK_LOGGED_IN_SESSION: MockSession = {
  authenticated: true,
  profile: {
    id: "mock-user-1",
    slug: "minh-anh",
    tenHienThi: "Minh Anh",
    giaiDoan: "dang_hoc",
  },
};

export function resolvePersona(giaiDoan: MockGiaiDoan | null | undefined): MockPersona {
  // LOGIC_TOUCH: home.persona
  // Real: lib/cins/home-adaptive/persona.ts → resolvePersona(giai_doan)
  // Mock: same mapping, driven by LabChrome select
  // Apply: read user_nguoi_dung.giai_doan; redirect /onboarding if null
  switch (giaiDoan) {
    case "dang_hoc":
      return "hoc";
    case "dang_day":
      return "day";
    case "dang_lam":
    case "tim_viec":
    case "freelance":
      return "lam";
    default:
      return "hoc";
  }
}

export function resolveSeeking(giaiDoan: MockGiaiDoan | null | undefined): boolean {
  return giaiDoan === "tim_viec";
}
