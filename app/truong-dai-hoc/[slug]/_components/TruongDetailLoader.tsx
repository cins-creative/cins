import { notFound } from "next/navigation";

import { TruongDetailView } from "@/components/truong/TruongDetailView";
import { CinsShell } from "@/components/cins/CinsShell";
import { getCurrentAuthUserId } from "@/lib/auth/session";
import { getOrgAdminStatus } from "@/lib/truong/org-admin";
import { getTruongPagePayload } from "@/lib/truong/queries";

type Props = {
  slug: string;
};

export async function TruongDetailLoader({ slug }: Props) {
  const payload = await getTruongPagePayload(slug);
  if (!payload) notFound();

  const authUserId = await getCurrentAuthUserId();
  const canEdit = await getOrgAdminStatus(slug, authUserId);

  return (
    <CinsShell data-screen-label="Truong-chi-tiet">
      <div className={`tdh-page tdh-page--v6${canEdit ? " tdh-page--can-edit" : ""}`}>
        <TruongDetailView payload={payload} canEdit={canEdit} />
      </div>
    </CinsShell>
  );
}
