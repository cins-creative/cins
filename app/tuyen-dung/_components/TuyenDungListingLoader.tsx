import { TuyenDungListingShell } from "@/app/tuyen-dung/_components/TuyenDungListingShell";
import { loadTuyenDungListing } from "@/lib/to-chuc/tuyen-dung-listing";

export async function TuyenDungListingLoader() {
  const { items, total } = await loadTuyenDungListing(48, 0);

  return <TuyenDungListingShell items={items} total={total} />;
}
