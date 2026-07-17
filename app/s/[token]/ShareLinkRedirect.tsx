"use client";

import { useEffect } from "react";

export function ShareLinkRedirect({ targetPath }: { targetPath: string }) {
  useEffect(() => {
    window.location.replace(targetPath);
  }, [targetPath]);

  return (
    <main>
      <p>Đang mở nội dung trên CINs…</p>
      <a href={targetPath}>Mở nội dung</a>
    </main>
  );
}
