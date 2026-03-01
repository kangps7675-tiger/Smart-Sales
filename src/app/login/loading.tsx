/**
 * 로그인 세그먼트 로딩 (랜딩 → 로그인 등)
 */

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">페이지 불러오는 중...</p>
      </div>
    </div>
  );
}
