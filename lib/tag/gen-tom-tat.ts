import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type TagLoai = "keyword" | "phan_mem";

const VECTOR_LOAI_DOI_TUONG = "bai_viet";

function buildTomTatPrompt(ten: string, loai: TagLoai): string {
  const kind =
    loai === "phan_mem"
      ? "Nếu là phần mềm: nêu nó dùng để làm gì."
      : "Nếu là kỹ thuật/khái niệm: nêu nó là gì.";

  return `Mô tả 1-2 câu ngắn gọn về "${ten}" trong ngữ cảnh ngành sáng tạo Việt Nam.
${kind}
Không markdown, không tiêu đề, chỉ trả về đúng câu mô tả.`;
}

async function callOpenAiTomTat(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.warn("[tag/gen-tom-tat] Thiếu OPENAI_API_KEY — bỏ qua gen tom_tat.");
    return null;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TAG_MODEL?.trim() || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 220,
    }),
  });

  if (!res.ok) {
    console.error("[tag/gen-tom-tat] OpenAI error:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  return text || null;
}

async function upsertVectorDongAfterGen(tagId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("vector_dong")
    .select("so_data_point")
    .eq("loai_doi_tuong", VECTOR_LOAI_DOI_TUONG)
    .eq("id_doi_tuong", tagId)
    .maybeSingle<{ so_data_point: number | null }>();

  const nextPoints = (existing?.so_data_point ?? 0) + 1;

  const { error } = await admin.from("vector_dong").upsert(
    {
      loai_doi_tuong: VECTOR_LOAI_DOI_TUONG,
      id_doi_tuong: tagId,
      do_tin_cay: 0,
      so_data_point: nextPoints,
      cap_nhat_cuoi: now,
      cap_nhat_tiep: null,
    },
    { onConflict: "loai_doi_tuong,id_doi_tuong" },
  );

  if (error) {
    console.error("[tag/gen-tom-tat] vector_dong upsert:", error.message);
  }
}

async function saveTomTat(tagId: string, tomTat: string): Promise<void> {
  const admin = createServiceRoleClient();
  const trimmed = tomTat.trim().slice(0, 500);
  if (!trimmed) return;

  const { error } = await admin
    .from("article_bai_viet")
    .update({
      tom_tat: trimmed,
      meta_description: trimmed,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", tagId);

  if (error) {
    console.error("[tag/gen-tom-tat] UPDATE article_bai_viet:", error.message);
    return;
  }

  await upsertVectorDongAfterGen(tagId);
}

/**
 * Gen tom_tat từ tên tag (phần 1). Regen khi so_data_point tăng đáng kể → TODO worker.
 */
export async function generateAndSaveTomTat(params: {
  tagId: string;
  ten: string;
  loai: TagLoai;
}): Promise<void> {
  const prompt = buildTomTatPrompt(params.ten, params.loai);
  const tomTat = await callOpenAiTomTat(prompt);
  if (!tomTat) return;
  await saveTomTat(params.tagId, tomTat);
}

/** Fire-and-forget — không block API tạo tag. */
export function enqueueTagTomTat(params: {
  tagId: string;
  ten: string;
  loai: TagLoai;
}): void {
  void generateAndSaveTomTat(params).catch((err) => {
    console.error("[tag/gen-tom-tat] async gen failed:", err);
  });
}

// TODO(v7-regen): Cron/worker regen tom_tat khi so_data_point tăng >= 10 so với lần gen trước,
// dùng tên tag + danh sách nghề người/tác phẩm tagged — không chỉ từ tên.
