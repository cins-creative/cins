/** Profile gợi nhớ trên trình duyệt — không chứa token/secret. */
export type RememberedAccount = {
  id: string;
  slug: string;
  tenHienThi: string | null;
  email: string | null;
  avatarId: string | null;
  savedAt: number;
};

const STORAGE_KEY = "cins-remembered-account:v1";

export function readRememberedAccount(): RememberedAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedAccount;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.slug !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRememberedAccount(
  profile: Omit<RememberedAccount, "savedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: RememberedAccount = {
      ...profile,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — bỏ qua */
  }
}

export function clearRememberedAccount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
