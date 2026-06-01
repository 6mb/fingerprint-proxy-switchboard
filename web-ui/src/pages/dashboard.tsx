import { KeyRound, Layers3, Network, ShieldCheck, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SourceErrors } from "@/components/dashboard/source-errors";
import { StatCard } from "@/components/dashboard/stat-card";
import { useStatusQuery } from "@/hooks/use-panel-data";
import { displayName, protocolSummary, shortCountryLabel, statusLabel, statusTone } from "@/lib/panel";

export default function DashboardPage() {
  const statusQuery = useStatusQuery();

  if (statusQuery.isLoading) {
    return <QueryState title="正在加载概览" description="正在读取 Mihomo 与节点状态。" loading />;
  }

  if (statusQuery.isError) {
    return <QueryState title="概览加载失败" description={statusQuery.error.message} />;
  }

  const data = statusQuery.data!;
  const protocolCards = protocolSummary(data.nodes);
  const testedCount = data.nodes.filter((node) => node.status !== "untested").length;
  const healthyCount = data.nodes.filter((node) => node.status === "ok").length;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="概览"
        description="总览端口槽位、节点池健康度与订阅源状态。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Mihomo 内核"
          value={data.version.version || data.version.meta || "-"}
          description="当前运行中的 Mihomo 版本信息"
          icon={Network}
        />
        <StatCard
          title="节点数量"
          value={`${data.source.nodeCount || data.nodes.length}`}
          description={`已测速 ${testedCount} 个，可用 ${healthyCount} 个`}
          icon={Layers3}
        />
        <StatCard
          title="代理认证"
          value={data.auth.proxyAuthConfigured ? "已开启" : "未开启"}
          description={
            data.auth.proxyAuthConfigured
              ? `当前代理账号 ${data.auth.proxyUsername || "user"}`
              : "浏览器代理无需额外账号密码"
          }
          icon={ShieldCheck}
        />
        <StatCard
          title="协议类型"
          value={`${protocolCards.length}`}
          description={(data.source.types || []).join(", ") || "尚未识别协议"}
          icon={KeyRound}
        />
      </div>

      <SourceErrors errors={data.source.errors || []} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>端口槽位状态</CardTitle>
            <CardDescription>每个自定义端口对应一个独立代理槽位。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {data.slots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-lg border border-border bg-muted/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">端口 {slot.port}</div>
                    <div className="text-xs text-muted-foreground">{slot.name}</div>
                  </div>
                  <Badge variant={statusTone(slot.selectedNode)}>
                    {statusLabel(slot.selectedNode)}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="truncate text-sm font-medium" title={slot.selectedNode?.name || slot.selected}>
                    {displayName(slot.selectedNode?.name || slot.selected || "未选择", 42)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {slot.selectedNode
                      ? `${shortCountryLabel(slot.selectedNode.country)} · ${slot.selectedNode.type || "proxy"}`
                      : "尚未绑定节点"}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>节点池分布</CardTitle>
            <CardDescription>按协议查看当前节点池规模。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {protocolCards.length ? (
              protocolCards.map(([protocol, count]) => (
                <div key={protocol} className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{protocol}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(count / Math.max(data.nodes.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-8 text-right text-sm text-muted-foreground">{count}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">暂无协议数据。</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>订阅源摘要</CardTitle>
          <CardDescription>便于快速确认来源、国家分布与异常情况。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              来源
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.source.sources || []).length ? (
                data.source.sources.map((source) => (
                  <Badge key={source} variant="outline">
                    {source}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无来源信息</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              国家
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.source.countries || []).length ? (
                data.source.countries.map((country) => (
                  <Badge key={`${country.code}-${country.name}`} variant="outline">
                    {shortCountryLabel(country)}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无国家信息</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              延迟状态
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TimerReset className="size-4" />
              已测速 {testedCount} 个，可用 {healthyCount} 个。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
