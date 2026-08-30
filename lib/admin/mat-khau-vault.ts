/**
 * Vault mật khẩu tài khoản seeding (AI + clone).
 * AES-256-GCM — key từ CINS_CLONE_PASSWORD_KEY (64 hex = 32 bytes).
 * Format lưu: base64(iv):base64(tag):base64(ciphertext)
 */
import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function layKey(): Buffer {
  const hex = process.env.CINS_CLONE_PASSWORD_KEY?.trim();
  if (!hex) {
    throw new Error(
      "Thiếu CINS_CLONE_PASSWORD_KEY (openssl rand -hex 32). Không fallback plaintext.",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "CINS_CLONE_PASSWORD_KEY phải là 64 ký tự hex (32 byte).",
    );
  }
  return Buffer.from(hex, "hex");
}

export function coVaultMatKhau(): boolean {
  const hex = process.env.CINS_CLONE_PASSWORD_KEY?.trim();
  return Boolean(hex && /^[0-9a-fA-F]{64}$/.test(hex));
}

export function maHoaMatKhau(plain: string): string {
  if (!plain) throw new Error("Mật khẩu rỗng.");
  const key = layKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function giaiMaMatKhau(blob: string): string {
  const raw = String(blob || "").trim();
  const i1 = raw.indexOf(":");
  const i2 = i1 >= 0 ? raw.indexOf(":", i1 + 1) : -1;
  if (i1 < 0 || i2 < 0) throw new Error("Vault mật khẩu không hợp lệ.");
  const ivB64 = raw.slice(0, i1);
  const tagB64 = raw.slice(i1 + 1, i2);
  const dataB64 = raw.slice(i2 + 1);
  const key = layKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== 16 || data.length < 1) {
    throw new Error("Vault mật khẩu không hợp lệ.");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

/** Mật khẩu ngẫu nhiên 16 ký tự (dễ copy, không ambiguous). */
export function sinhMatKhauNgauNhien(len = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}
