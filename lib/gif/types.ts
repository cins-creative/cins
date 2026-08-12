export type GifResult = {
  id: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
  title?: string;
};

export type GifPage = {
  items: GifResult[];
  next: string | null;
};
