import { getRiveObject, isValidRiveObjectKey } from "@/lib/cloudflare/r2-rive";

type Params = { params: Promise<{ path?: string[] }> };

/** GET /api/rive-asset/rive/{profileId}/{uuid}.riv — phục vụ file .riv từ R2. */
export async function GET(_request: Request, { params }: Params) {
  const segments = (await params).path ?? [];
  const key = segments.join("/");

  if (!isValidRiveObjectKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getRiveObject(key);
  if (!object.ok) {
    return new Response(object.error, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": object.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (object.size) {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(object.body, { status: 200, headers });
}
