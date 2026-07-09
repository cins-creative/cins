export type UserEmojiMuc = {
  id: string;
  boId: string;
  cloudflareId: string;
  url: string | null;
  tenGoi: string | null;
  thuTu: number;
};

export type UserEmojiBo = {
  id: string;
  ten: string;
  thuTu: number;
  cloudflareIdAnhBia: string | null;
  thumbnailUrl: string | null;
  items: UserEmojiMuc[];
};

export type UserEmojiPackResponse = {
  boList: UserEmojiBo[];
  limits: {
    maxBo: number;
    maxMucPerBo: number;
  };
};
