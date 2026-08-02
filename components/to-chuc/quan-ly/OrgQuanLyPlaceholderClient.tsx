"use client";

type Props = {
  title: string;
  description?: string;
};

/** Placeholder tạm khi mục quản lý chưa có UI đầy đủ. */
export function OrgQuanLyPlaceholderClient({ title, description }: Props) {
  return (
    <div className="cso-ql-placeholder">
      <h1 className="cso-ql-placeholder-title">{title}</h1>
      <p className="cso-ql-placeholder-desc">
        {description ??
          "Mục này đang được xây dựng. Nội dung quản lý sẽ sớm có tại đây."}
      </p>
    </div>
  );
}
