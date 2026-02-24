/**
 * 유틸리티 함수 모음
 * 
 * @file utils.ts
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS 클래스명 병합 유틸리티
 * 
 * clsx로 클래스명을 결합하고, twMerge로 충돌하는 Tailwind 클래스를 병합합니다.
 * 예: "px-2 px-4" → "px-4" (나중 값이 우선)
 * 
 * @param inputs - 병합할 클래스명들 (문자열, 객체, 배열 등)
 * @returns 병합된 클래스명 문자열
 * 
 * @example
 * cn("px-2", "px-4") // "px-4"
 * cn("text-red-500", { "text-blue-500": true }) // "text-blue-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
