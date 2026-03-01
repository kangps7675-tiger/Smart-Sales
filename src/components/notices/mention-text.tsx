"use client";

/**
 * 본문/댓글에서 @이름 멘션을 하이라이트하여 표시
 * 저장은 그대로 문자열(@이름 포함), 표시 시에만 span으로 감쌈
 */
export function MentionText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(@[^\s@]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-primary/15 px-0.5 font-medium text-primary"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
