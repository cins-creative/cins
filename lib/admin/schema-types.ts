/** Types + labels an toàn cho Client Component — không import DB/server. */

export type SchemaDomainId =
  | "org"
  | "chat"
  | "shop"
  | "article"
  | "user"
  | "content"
  | "social"
  | "edu"
  | "verify"
  | "linh_vuc"
  | "vector"
  | "filter"
  | "cong_dong"
  | "project"
  | "other";

export type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
};

export type SchemaFk = {
  column: string;
  refTable: string;
  refColumn: string;
};

export type SchemaTable = {
  name: string;
  domain: SchemaDomainId;
  kind: "table" | "partitioned";
  pk: string[];
  columns: SchemaColumn[];
  fks: SchemaFk[];
};

export type SchemaEnum = {
  name: string;
  values: string[];
};

export type SchemaPartition = {
  name: string;
  parent: string;
};

export type SchemaListing = {
  queriedAt: string;
  tables: SchemaTable[];
  enums: SchemaEnum[];
  partitions: SchemaPartition[];
  domainCounts: { domain: SchemaDomainId; count: number }[];
};

export const SCHEMA_DOMAIN_LABELS: Record<SchemaDomainId, string> = {
  org: "Tổ chức",
  chat: "Chat",
  shop: "Shop",
  article: "Bài viết / Tag",
  user: "Người dùng",
  content: "Nội dung Journey",
  social: "Social",
  edu: "Giáo dục",
  verify: "Verify",
  linh_vuc: "Lĩnh vực",
  vector: "Vector",
  filter: "Filter",
  cong_dong: "Cộng đồng",
  project: "Dự án",
  other: "Khác",
};

export function schemaDomainOf(tableName: string): SchemaDomainId {
  if (tableName.startsWith("org_")) return "org";
  if (tableName.startsWith("chat_")) return "chat";
  if (tableName.startsWith("shop_")) return "shop";
  if (tableName.startsWith("article_")) return "article";
  if (tableName.startsWith("user_")) return "user";
  if (tableName.startsWith("content_")) return "content";
  if (tableName.startsWith("social_")) return "social";
  if (tableName.startsWith("edu_")) return "edu";
  if (tableName.startsWith("verify_")) return "verify";
  if (tableName.startsWith("linh_vuc")) return "linh_vuc";
  if (tableName.startsWith("vector_")) return "vector";
  if (tableName.startsWith("filter_")) return "filter";
  if (tableName.startsWith("cong_dong_")) return "cong_dong";
  if (tableName.startsWith("project_")) return "project";
  return "other";
}
