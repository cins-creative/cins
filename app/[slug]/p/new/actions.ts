"use server";

/** Re-export — implementation ở `lib/editor/post-publish-action.ts` (đường dẫn ổn định cho client). */
export {
  publishPost,
  type PublishPostInput,
  type PublishPostResult,
} from "@/lib/editor/post-publish-action";
