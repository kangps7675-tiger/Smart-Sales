/**
 * 비밀번호 유효성 검사
 *
 * 규칙: 최소 8자 이상, 특수문자 1자 이상 포함
 *
 * @file password-validation.ts
 */

/** 특수문자 포함 여부 정규식 (공백 제외) */
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * 비밀번호 규칙 검사
 *
 * @param password - 검사할 비밀번호
 * @returns valid: 통과 여부, message: 실패 시 안내 문구
 */
export function validatePassword(password: string): PasswordValidationResult {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { valid: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (!SPECIAL_CHAR_REGEX.test(trimmed)) {
    return { valid: false, message: "비밀번호에 특수문자를 1자 이상 포함해 주세요." };
  }
  return { valid: true };
}
