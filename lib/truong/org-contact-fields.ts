/** Cột liên hệ trên org_to_chuc — cần migration org-truong-contact-fields.sql */
export const ORG_CONTACT_FIELD_KEYS = [
  "dia_chi",
  "dien_thoai",
  "email_lien_he",
] as const;

export type OrgContactFieldKey = (typeof ORG_CONTACT_FIELD_KEYS)[number];

export function isMissingOrgContactColumnError(
  message: string | undefined,
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  if (!m.includes("column")) return false;
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    ORG_CONTACT_FIELD_KEYS.some((col) => m.includes(col))
  );
}

export function splitOrgPatch(patch: Record<string, unknown>): {
  contact: Partial<Record<OrgContactFieldKey, unknown>>;
  rest: Record<string, unknown>;
} {
  const contact: Partial<Record<OrgContactFieldKey, unknown>> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if ((ORG_CONTACT_FIELD_KEYS as readonly string[]).includes(key)) {
      contact[key as OrgContactFieldKey] = value;
    } else {
      rest[key] = value;
    }
  }
  return { contact, rest };
}

export function emptyOrgContactFields(): Record<OrgContactFieldKey, null> {
  return { dia_chi: null, dien_thoai: null, email_lien_he: null };
}
