import { TruongListingClient } from "@/components/truong/TruongListingClient";
import { listCoSoDaoTaoForListing } from "@/lib/to-chuc/listing-queries";
import { listTruongDaiHoc } from "@/lib/truong/queries";

export async function TruongListingLoader() {
  const [truongDaiHoc, coSoDaoTao] = await Promise.all([
    listTruongDaiHoc(),
    listCoSoDaoTaoForListing(),
  ]);
  const schools = [...truongDaiHoc, ...coSoDaoTao].sort((a, b) =>
    a.ten.localeCompare(b.ten, "vi"),
  );

  return (
    <div className="tdh-page">
      <TruongListingClient schools={schools} />
    </div>
  );
}
