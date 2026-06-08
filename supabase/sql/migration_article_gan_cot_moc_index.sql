-- Index tag → cột mốc cho trang entity (keyword / phần mềm / môn học).
CREATE INDEX IF NOT EXISTS idx_article_gan_cot_moc_id_bai_viet
  ON article_gan_cot_moc (id_bai_viet);
