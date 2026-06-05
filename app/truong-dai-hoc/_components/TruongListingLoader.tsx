import { TruongListingClient } from "@/components/truong/TruongListingClient";
import { listTruongDaiHoc } from "@/lib/truong/queries";

export async function TruongListingLoader() {
  const schools = await listTruongDaiHoc();

  return (
    <div className="tdh-page">
      <TruongListingClient schools={schools} />
    </div>
  );
}
