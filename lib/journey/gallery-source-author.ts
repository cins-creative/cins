import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import type { GalleryStub, OwnerProfile } from "@/lib/journey/gallery-stubs";

export type GallerySourcePerson = {
  id?: string;
  name: string;
  avatarUrl: string | null;
  initial?: string;
};

export type GallerySourceAuthor = {
  /** Hiện avatar góc thumb — nguồn ngoại lai / bài có ≥2 người đóng góp. */
  showCorner: boolean;
  /** Người có vai trò trong dự án (chủ + cộng sự accepted). */
  people: GallerySourcePerson[];
  /** Người đứng đầu — dùng overlay hover. */
  name: string | null;
  avatarUrl: string | null;
};

const MAX_CORNER_PEOPLE = 4;

function creditToPerson(c: CoAuthorCredit): GallerySourcePerson {
  const name = c.name?.trim() || "?";
  return {
    id: c.idNguoiDung,
    name,
    avatarUrl: c.avatarUrl ?? null,
    initial: c.initial ?? name.charAt(0).toUpperCase(),
  };
}

function dedupePeople(people: GallerySourcePerson[]): GallerySourcePerson[] {
  const seen = new Set<string>();
  const out: GallerySourcePerson[] = [];
  for (const p of people) {
    const key = (p.id ?? p.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function peopleFromCredits(
  accepted: ReadonlyArray<CoAuthorCredit>,
  ownerProfile?: OwnerProfile,
  postOwnerId?: string,
): GallerySourcePerson[] {
  const fromCredits = accepted
    .slice()
    .sort((a, b) => Number(Boolean(b.laChuSoHuu)) - Number(Boolean(a.laChuSoHuu)))
    .map(creditToPerson);

  const fallbackOwner: GallerySourcePerson | null =
    ownerProfile && postOwnerId
      ? {
          id: postOwnerId,
          name: ownerProfile.name ?? ownerProfile.slug,
          avatarUrl: ownerProfile.avatarUrl,
          initial: (ownerProfile.name ?? ownerProfile.slug).charAt(0).toUpperCase(),
        }
      : null;

  return dedupePeople([
    ...fromCredits,
    ...(fromCredits.length === 0 && fallbackOwner ? [fallbackOwner] : []),
  ]).slice(0, MAX_CORNER_PEOPLE);
}

/**
 * Tác giả/nguồn hiển thị trên thumb gallery pinned / main card / featured preview.
 * `credits` = cộng sự accepted trên tác phẩm / bài org.
 */
export function resolveGallerySourceAuthor(
  entry: GalleryStub,
  journeyOwnerId: string,
  ownerProfile?: OwnerProfile,
  credits: ReadonlyArray<CoAuthorCredit> = [],
): GallerySourceAuthor {
  const accepted = credits.filter((c) => c.trangThai !== "pending");
  const isOrgPost = Boolean(entry.orgHref && !entry.tacPhamSlug);

  if (isOrgPost) {
    const orgName = entry.orgKicker?.trim() || null;
    const orgAvatar = entry.orgAvatarUrl ?? null;
    const people = dedupePeople([
      ...(orgName || orgAvatar
        ? [
            {
              id: `org:${entry.cotMocId}`,
              name: orgName ?? "Tổ chức",
              avatarUrl: orgAvatar,
              initial: (orgName ?? "T").charAt(0).toUpperCase(),
            },
          ]
        : []),
      ...accepted.map(creditToPerson),
    ]).slice(0, MAX_CORNER_PEOPLE);

    /* Chỉ hiện avatar khi bài có đóng góp nhiều người — không gắn avatar tổ chức đơn lẻ. */
    if (people.length < 2) {
      return { showCorner: false, people: [], name: null, avatarUrl: null };
    }

    return {
      showCorner: true,
      people,
      name: orgName,
      avatarUrl: orgAvatar,
    };
  }

  const isForeignOwner = entry.postOwnerId !== journeyOwnerId;
  const hasCollaborators =
    accepted.some((c) => !c.laChuSoHuu) || accepted.length > 1;
  const showForeignCorner =
    (entry.variant === "tagged" && isForeignOwner) ||
    (entry.variant === "bookmark" && isForeignOwner) ||
    (entry.variant === "verified" && isForeignOwner);

  if (!showForeignCorner && !hasCollaborators) {
    return { showCorner: false, people: [], name: null, avatarUrl: null };
  }

  const people = peopleFromCredits(accepted, ownerProfile, entry.postOwnerId);
  const head = people[0] ?? null;
  return {
    showCorner: people.length > 0,
    people,
    name: head?.name ?? null,
    avatarUrl: head?.avatarUrl ?? null,
  };
}
