export type CalcResultState = "idle" | "pass" | "close" | "fail";

export function evaluateAdmissionScore(
  score: number | null,
  threshold: number,
): { state: CalcResultState; score: string; label: string } {
  if (score == null || Number.isNaN(score)) {
    return { state: "idle", score: "—", label: "Nhập điểm để tính" };
  }
  const diff = score - threshold;
  const formatted = score.toFixed(2);
  if (threshold <= 0) {
    return { state: "pass", score: formatted, label: "Điểm xét tuyển" };
  }
  if (diff >= 0) {
    return {
      state: "pass",
      score: formatted,
      label: `✓ Đậu — vượt ${diff.toFixed(1)} điểm`,
    };
  }
  if (diff >= -2) {
    return {
      state: "close",
      score: formatted,
      label: `Sát điểm — cần thêm ${Math.abs(diff).toFixed(1)}`,
    };
  }
  return {
    state: "fail",
    score: formatted,
    label: `Thiếu ${Math.abs(diff).toFixed(1)} điểm`,
  };
}
