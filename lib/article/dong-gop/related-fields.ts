import type { PickableTagLoai } from "@/lib/tag/tag-loai";

export type ContribRelatedField = {
  loai: PickableTagLoai;
  label: string;
  placeholder: string;
};

const FIELD = {
  nganh: {
    loai: "nganh_dao_tao",
    label: "Ngành học",
    placeholder: "Gắn ngành đào tạo liên quan…",
  },
  keyword: {
    loai: "keyword",
    label: "Kỹ thuật",
    placeholder: "Gắn khái niệm / kỹ thuật…",
  },
  keywordPeer: {
    loai: "keyword",
    label: "Keyword liên quan",
    placeholder: "Gắn khái niệm liên quan…",
  },
  nghe: {
    loai: "nghe",
    label: "Nghề liên quan",
    placeholder: "Gắn nghề nghiệp liên quan…",
  },
  ngheJobs: {
    loai: "nghe",
    label: "Nghề",
    placeholder: "Gắn vị trí công việc…",
  },
  phanMem: {
    loai: "phan_mem",
    label: "Phần mềm",
    placeholder: "Gắn phần mềm liên quan…",
  },
  phanMemPeer: {
    loai: "phan_mem",
    label: "Phần mềm tương tự",
    placeholder: "Gắn phần mềm tương tự…",
  },
  monHoc: {
    loai: "mon_hoc",
    label: "Môn học",
    placeholder: "Gắn môn học liên quan…",
  },
} as const satisfies Record<string, ContribRelatedField>;

/** Field gắn thẻ theo loại entity đang đóng góp. */
export function relatedFieldsForLoaiBaiViet(
  loaiBaiViet: string,
): ContribRelatedField[] {
  switch (loaiBaiViet) {
    case "nghe":
      return [FIELD.nganh, FIELD.phanMem, FIELD.nghe, FIELD.keyword];
    case "nganh_dao_tao":
      return [FIELD.monHoc];
    case "mon_hoc":
      return [FIELD.nganh, FIELD.phanMem];
    case "keyword":
      return [FIELD.ngheJobs, FIELD.phanMem, FIELD.keywordPeer];
    case "phan_mem":
      return [FIELD.ngheJobs, FIELD.keyword, FIELD.phanMemPeer];
    default:
      return [FIELD.nganh, FIELD.keyword, FIELD.nghe];
  }
}
