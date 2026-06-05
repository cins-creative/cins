import { cache } from "react";

import {
  fetchMilestonePostDetail,
  fetchPostBySlug,
  fetchPostCommentsForViewer,
  fetchPostPageCore,
} from "@/lib/journey/post-page-fetch";

/** Request-level dedupe — metadata + page + modal cùng request. */
export const getCachedPostBySlug = cache(fetchPostBySlug);
export const getCachedPostPageCore = cache(fetchPostPageCore);
export const getCachedMilestonePostDetail = cache(fetchMilestonePostDetail);
export const getCachedPostCommentsForViewer = cache(fetchPostCommentsForViewer);
