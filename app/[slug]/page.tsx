import {
  journeyPageGenerateMetadata,
  JourneyPageRoute,
  type JourneyMetadataSearchParams,
  type JourneyPageParams,
  type JourneyPageSearchParams,
} from "@/app/[slug]/_lib/journey-page-route";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: JourneyPageParams;
  searchParams?: JourneyMetadataSearchParams;
}) {
  return journeyPageGenerateMetadata({ params, searchParams });
}

export default async function SlugJourneyPage({
  params,
  searchParams,
}: {
  params: JourneyPageParams;
  searchParams: JourneyPageSearchParams;
}) {
  return JourneyPageRoute({ params, searchParams });
}
