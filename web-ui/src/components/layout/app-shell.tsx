import {
  Activity,
  ArrowUpDown,
  Gauge,
  LogOut,
  Menu,
  RefreshCw,
  Rss,
  Route,
  Server,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBatchDelayMutation, usePanelRefresh, useReloadMutation, useStatusQuery } from "@/hooks/use-panel-data";
import { useLogoutMutation } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "概览", href: "/dashboard", icon: Gauge },
  { label: "端口槽位", href: "/slots", icon: ArrowUpDown },
  { label: "节点池", href: "/nodes", icon: Server },
  { label: "订阅源", href: "/sources", icon: Rss },
];

function BrandMark() {
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Route className="size-4" />
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const statusQuery = useStatusQuery();
  const refresh = usePanelRefresh();
  const reloadMutation = useReloadMutation();
  const batchDelayMutation = useBatchDelayMutation();
  const logoutMutation = useLogoutMutation();

  const pageTitle = useMemo(() => {
    return navItems.find((item) => location.pathname.startsWith(item.href))?.label || "管理台";
  }, [location.pathname]);

  const slotSummary = statusQuery.data?.slots.length
    ? `${statusQuery.data.slots.length} 个自定义槽位`
    : "自定义槽位管理";

  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success("状态已刷新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    }
  };

  const handleDelayAll = async () => {
    const names = statusQuery.data?.nodes.map((node) => node.name) || [];
    if (!names.length) {
      toast.message("当前没有可测速节点");
      return;
    }

    try {
      const result = await batchDelayMutation.mutateAsync({ names });
      toast.success(`已测速 ${result.tested} 个，可用 ${result.healthy} 个`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "测速失败");
    }
  };

  const handleReload = async () => {
    try {
      const result = await reloadMutation.mutateAsync();
      toast.success(`已重载 ${result.generated.nodes} 个节点`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重载失败");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/login");
      toast.success("已退出登录");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出失败");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <NavLink to="/dashboard" className="flex items-center gap-3 font-medium">
            <BrandMark />
            <div className="space-y-0.5">
              <div className="font-heading text-sm font-semibold tracking-tight">FP Switchboard</div>
              <div className="text-xs text-sidebar-foreground/60">指纹浏览器代理管理台</div>
            </div>
          </NavLink>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
          </Button>
        </div>

        <div className="flex-1 px-3 py-4">
          <div className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            工作区
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut />
            退出登录
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="page-shell flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu />
              </Button>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {pageTitle}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {slotSummary}，节点切换与订阅管理统一在此完成。
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={statusQuery.isFetching}
              >
                <RefreshCw className={cn(statusQuery.isFetching && "animate-spin")} />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelayAll}
                disabled={batchDelayMutation.isPending || !statusQuery.data?.nodes.length}
              >
                <Activity className={cn(batchDelayMutation.isPending && "animate-pulse")} />
                全部测速
              </Button>
              <Button
                size="sm"
                onClick={handleReload}
                disabled={reloadMutation.isPending}
              >
                重载配置
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
