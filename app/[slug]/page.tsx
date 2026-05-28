import {
  generateMetadata,
  renderJourneyPage,
} from "@/app/[slug]/journey/page";

export { generateMetadata };

export const dynamic = "force-dynamic";

export default renderJourneyPage;
