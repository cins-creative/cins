import { GuestHomeStageMasonry } from "@/components/cins/guest-home/GuestHomeStageMasonry";
import { loadGuestHomeStageMasonry } from "@/lib/cins/guest-home/loadGuestHomeStageMasonry";

export { guestHomeStageMedia } from "@/components/cins/guest-home/guestHomeStageMedia";

export async function GuestHomeStage() {
  const items = await loadGuestHomeStageMasonry();

  return (
    <div className="gh-stage">
      <GuestHomeStageMasonry items={items} />

      <div className="gh-stage-hero">
        <div className="gh-stage-hero-inner">
          <p className="gh-stage-marks" aria-hidden>
            <span className="gh-stage-mark gh-stage-mark--tri" />
            <span className="gh-stage-mark gh-stage-mark--dia" />
            <span className="gh-stage-mark gh-stage-mark--dot" />
            <span className="gh-stage-mark gh-stage-mark--sq" />
          </p>
          <h1 className="gh-stage-title">
            <span className="gh-stage-title-line">Show</span>
            <span className="gh-stage-title-line gh-stage-title-line--grad">
              Your product
            </span>
            <span className="gh-stage-title-line">To the world</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
