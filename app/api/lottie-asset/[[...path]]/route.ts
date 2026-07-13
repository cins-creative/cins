import {
  getLottieObject,
  isValidLottieObjectKey,
} from "@/lib/cloudflare/r2-lottie";

type Params = { params: Promise<{ path?: string[] }> };

/** GET /api/lottie-asset/lottie/{profileId}/{uuid}.lottie — phục vụ file từ R2. */
export async function GET(_request: Request, { params }: Params) {
  const segments = (await params).path ?? [];
  const key = segments.join("/");

  if (!isValidLottieObjectKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getLottieObject(key);
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
