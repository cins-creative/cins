import Image from "@tiptap/extension-image";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

function syncImageBadge(
  wrap: HTMLElement,
  img: HTMLImageElement,
  badge: HTMLElement,
  node: ProseMirrorNode,
) {
  img.src = node.attrs.src ?? "";
  img.alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const title = typeof node.attrs.title === "string" ? node.attrs.title.trim() : "";
  if (title) {
    img.title = title;
    badge.textContent = title;
    badge.hidden = false;
    wrap.dataset.status = title.includes("Đang tải")
      ? "busy"
      : title.includes("thành công")
        ? "ok"
        : "info";
  } else {
    img.removeAttribute("title");
    badge.textContent = "";
    badge.hidden = true;
    delete wrap.dataset.status;
  }
}

/** Ảnh draft — badge trạng thái upload đè lên ảnh (không dùng banner phía trên). */
export const ArticleDraftImage = Image.extend({
  addNodeView() {
    return ({ node }) => {
      const wrap = document.createElement("span");
      wrap.className = "article-draft-tiptap__img-wrap";
      wrap.contentEditable = "false";

      const img = document.createElement("img");
      img.draggable = false;

      const badge = document.createElement("span");
      badge.className = "article-draft-tiptap__img-badge";
      badge.setAttribute("role", "status");
      badge.setAttribute("aria-live", "polite");

      syncImageBadge(wrap, img, badge, node);
      wrap.append(img, badge);

      return {
        dom: wrap,
        update(updatedNode) {
          if (updatedNode.type.name !== "image") return false;
          syncImageBadge(wrap, img, badge, updatedNode);
          return true;
        },
      };
    };
  },
});
