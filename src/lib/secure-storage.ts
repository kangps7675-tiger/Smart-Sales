/**
 * localStorage 암호화 스토리지 (crypto-js)
 *
 * 백엔드 도입 전 임시로 민감 데이터를 암호화해 저장합니다.
 * Zustand persist의 storage 옵션으로 사용합니다.
 *
 * 암호화 키: NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY (없으면 기본값 사용, 프로덕션에서는 반드시 설정 권장)
 *
 * @file secure-storage.ts
 */

import CryptoJS from "crypto-js";

const DEFAULT_KEY = "phone-store-saas-default-key-change-in-production";

function getEncryptionKey(): string {
  if (typeof window === "undefined") return DEFAULT_KEY;
  return (process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY ?? DEFAULT_KEY).slice(0, 32);
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

function decrypt(cipherText: string): string {
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8) || "";
  } catch {
    return "";
  }
}

export interface EncryptedStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

/**
 * Zustand persist용 암호화 스토리지 생성
 *
 * @param storageKey - localStorage에 저장할 키 이름 (기존 persist name과 동일하게 사용)
 */
export function createEncryptedStorage(storageKey: string): EncryptedStorage {
  return {
    getItem: (name: string): string | null => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(name);
        if (raw == null || raw === "") return null;
        const decrypted = decrypt(raw);
        if (decrypted !== "") return decrypted;
        // 마이그레이션: 기존 평문 JSON이면 한 번 반환 (다음 setItem 시 암호화되어 저장됨)
        if (raw.startsWith("{") || raw.startsWith("[")) return raw;
        return null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      if (typeof window === "undefined") return;
      try {
        const encrypted = encrypt(value);
        localStorage.setItem(name, encrypted);
      } catch {
        // fallback: 저장 실패 시 암호화 없이 저장하지 않음 (데이터 유실 방지용으로는 원본 저장 가능하나, 보안상 생략)
      }
    },
    removeItem: (name: string): void => {
      if (typeof window === "undefined") return;
      localStorage.removeItem(name);
    },
  };
}
