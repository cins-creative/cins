"use server";

/** Re-export — implementation ở `lib/editor/post-update-action.ts` (đường dẫn ổn định cho client). */
export {
  updatePost,
  type UpdatePostInput,
  type UpdatePostResult,
} from "@/lib/editor/post-update-action";
