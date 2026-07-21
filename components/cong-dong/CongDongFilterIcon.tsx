import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Code,
  FileText,
  Folder,
  GraduationCap,
  Handshake,
  Hash,
  Heart,
  HelpCircle,
  Image,
  Lightbulb,
  Link,
  MapPin,
  Megaphone,
  MessageCircle,
  Music,
  Newspaper,
  Palette,
  Paperclip,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import {
  CONG_DONG_FILTER_ICON_IDS,
  isCongDongFilterIconId,
  type CongDongFilterIconId,
} from "@/lib/cong-dong/filter-icons";

const ICON_MAP: Record<CongDongFilterIconId, LucideIcon> = {
  palette: Palette,
  "help-circle": HelpCircle,
  briefcase: Briefcase,
  "book-open": BookOpen,
  bell: Bell,
  megaphone: Megaphone,
  calendar: Calendar,
  users: Users,
  "message-circle": MessageCircle,
  image: Image,
  video: Video,
  "file-text": FileText,
  link: Link,
  star: Star,
  heart: Heart,
  "map-pin": MapPin,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  code: Code,
  music: Music,
  camera: Camera,
  newspaper: Newspaper,
  "shopping-bag": ShoppingBag,
  handshake: Handshake,
  paperclip: Paperclip,
  folder: Folder,
  tag: Tag,
  hash: Hash,
};

export { CONG_DONG_FILTER_ICON_IDS, isCongDongFilterIconId };
export type { CongDongFilterIconId };

export function hasCongDongFilterLucideIcon(
  name: string | null | undefined,
): boolean {
  return isCongDongFilterIconId(name);
}

type Props = {
  name: string | null | undefined;
  size?: number;
  color?: string;
};

export function CongDongFilterIcon({ name, size = 16, color }: Props) {
  if (!isCongDongFilterIconId(name)) return null;
  const Icon = ICON_MAP[name];
  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden
      style={color ? { color } : undefined}
    />
  );
}

export function CongDongFilterIconGlyph({
  name,
  size = 16,
}: {
  name: CongDongFilterIconId;
  size?: number;
}) {
  const Icon = ICON_MAP[name];
  return <Icon size={size} strokeWidth={2} aria-hidden />;
}
