"use client";



import { useMemo } from "react";



import { OrgBaiDangTimelineCard } from "@/components/truong/OrgBaiDangTimelineCard";

import { TruongBaiDangEditProvider } from "@/components/truong/inline/TruongBaiDangEdit";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

import type { TruongBaiDang } from "@/lib/truong/types";



function formatDate(iso: string | null): string | null {

  if (!iso) return null;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return null;

  return d.toLocaleDateString("vi-VN", {

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



type Props = { posts: TruongBaiDang[] };



export function TruongTabBaidang({ posts: postsProp }: Props) {

  const ctx = useTruongInlineEdit();

  const posts = ctx?.baidang ?? postsProp;



  const sorted = useMemo(

    () =>

      [...posts].sort((a, b) => {

        const ta = a.tao_luc ? new Date(a.tao_luc).getTime() : 0;

        const tb = b.tao_luc ? new Date(b.tao_luc).getTime() : 0;

        return tb - ta;

      }),

    [posts],

  );



  return (

    <TruongBaiDangEditProvider>

      {sorted.length === 0 ? (

        <p className="tdh-placeholder">

          Chưa có bài đăng công khai. Tin tuyển sinh và sự kiện sẽ hiển thị tại

          đây khi trường đăng trên CINs.

        </p>

      ) : (

        <div className="post-stream">

          <div className="org-timeline">

            {sorted.map((post) => (

              <OrgBaiDangTimelineCard

                key={post.id}

                post={post}

                dateLabel={formatDate(post.tao_luc)}

              />

            ))}

          </div>

        </div>

      )}

    </TruongBaiDangEditProvider>

  );

}

