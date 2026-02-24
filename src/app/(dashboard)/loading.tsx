/**
 * 대시보드 공통 로딩 화면
 *
 * (dashboard) 그룹에서 페이지 전환 시
 * 서버 컴포넌트가 준비되는 동안 보여주는 스피너 UI
 */

export default function DashboardLoading() {
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

