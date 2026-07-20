import {
  serializeJsonLd,
  type JsonLdObject,
} from "@/lib/seo/json-ld";

/** Render một hoặc nhiều schema.org objects dưới dạng JSON-LD. */
export function JsonLdScript({
  data,
}: {
  data: JsonLdObject | JsonLdObject[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
