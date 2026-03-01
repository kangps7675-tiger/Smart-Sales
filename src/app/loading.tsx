/**
 * 루트 공통 로딩 화면
 *
 * 로그인·랜딩·가입 등 루트 세그먼트로 이동할 때
 * 서버 컴포넌트가 준비되는 동안 표시됩니다.
 */

export default function RootLoading() {
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
