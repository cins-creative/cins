import {
  BookOpen,
  Briefcase,
  HelpCircle,
  Palette,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  palette: Palette,
  "help-circle": HelpCircle,
  briefcase: Briefcase,
  "book-open": BookOpen,
};

type Props = {
  name: string | null | undefined;
  size?: number;
  color?: string;
};

export function CongDongFilterIcon({ name, size = 16, color }: Props) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden
      style={color ? { color } : undefined}
    />
  );
}
