import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  AdminTopbar,
  type AdminTopbarProfile,
} from "@/components/admin/AdminTopbar";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getCurrentUserSystemRole,
  systemRoleLabel,
} from "@/lib/auth/system-role";
import { getAvatarUrl } from "@/lib/journey/profile";

type Props = {
  children: React.ReactNode;
};

export async function AdminShell({ children }: Props) {
  const [session, role] = await Promise.all([
    getCurrentSessionAndProfile(),
    getCurrentUserSystemRole(),
  ]);

  const profile: AdminTopbarProfile | null = session?.profile
    ? {
        slug: session.profile.slug,
        tenHienThi: session.profile.ten_hien_thi,
        avatarUrl: getAvatarUrl(session.profile.avatar_id),
      }
    : null;

  const roleLabel = systemRoleLabel(role);

  return (
    <div className="cins-admin">
      <div className="admin-layout">
        <AdminSidebar profile={profile} roleLabel={roleLabel} />
        <div className="main">
          <AdminTopbar profile={profile} roleLabel={roleLabel} />
          {children}
        </div>
      </div>
    </div>
  );
}
