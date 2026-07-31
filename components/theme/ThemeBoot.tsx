"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";

import { THEME_BOOT_SCRIPT } from "@/lib/theme/theme-mode";

/**
 * No-flash theme: inject `<script>` vào SSR stream ngoài React tree.
 * Tránh React 19 warning khi render `<script>` / next/script trong layout.
 */
export function ThemeBoot() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="cins-theme-boot"
        dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
      />
    );
  });

  return null;
}
