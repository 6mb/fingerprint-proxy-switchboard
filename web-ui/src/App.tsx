import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import { QueryState } from "@/components/ui/query-state";
import { useSessionQuery } from "@/hooks/use-session";
import DashboardPage from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NodesPage from "@/pages/nodes";
import SlotsPage from "@/pages/slots";
import SourcesPage from "@/pages/sources";

function SessionGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sessionQuery = useSessionQuery();

  if (sessionQuery.isLoading) {
    return (
      <QueryState
        title="正在连接管理台"
        description="正在检查登录状态与服务可用性。"
        compact={false}
      />
    );
  }

  if (sessionQuery.isError) {
    return (
      <QueryState
        title="管理台暂时不可用"
        description={sessionQuery.error.message}
        compact={false}
      />
    );
  }

  const session = sessionQuery.data!;
  const requiresAuth = session.authRequired;
  const isAuthenticated = session.authenticated || !requiresAuth;

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <SessionGate>
            <AppShell />
          </SessionGate>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/slots" element={<SlotsPage />} />
        <Route path="/nodes" element={<NodesPage />} />
        <Route path="/sources" element={<SourcesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
