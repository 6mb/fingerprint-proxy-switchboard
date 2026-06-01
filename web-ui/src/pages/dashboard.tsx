import { Gauge, KeyRound, Layers3, Network, Radar, ShieldCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceErrors } from "@/components/dashboard/source-errors";
import { StatCard } from "@/components/dashboard/stat-card";
import { useProbeSlotMutation, useSingleDelayMutation, useStatusQuery } from "@/hooks/use-panel-data";
import { displayName, egressPurityLabel, egressPurityTone, protocolSummary, shortCountryLabel, statusLabel, statusTone } from "@/lib/panel";

export default function DashboardPage() {
  const statusQuery = useStatusQuery();
  const delayMutation = useSingleDelayMutation();
  const probeMutation = useProbeSlotMutation();

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
  const fraudTone = (score?: number) => {
    if (typeof score !== "number") return "unknown" as const;
    if (score <= 25) return "good" as const;
    if (score <= 60) return "warn" as const;
    return "bad" as const;
  };

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

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">端口槽位状态</h2>
          <p className="text-sm text-muted-foreground">
            优先查看每个端口槽位的绑定节点、出口检测与纯净度状态。
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
            {data.slots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-lg border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">端口 {slot.port}</div>
                      <Badge variant="outline">{slot.name}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {slot.selectedNode
                        ? `${shortCountryLabel(slot.selectedNode.country)} · ${slot.selectedNode.type || "proxy"}`
                        : "尚未绑定节点"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <Badge variant={statusTone(slot.selectedNode)}>
                      {statusLabel(slot.selectedNode)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !slot.selectedNode?.name
                        || (delayMutation.isPending && delayMutation.variables?.name === slot.selectedNode?.name)
                      }
                      onClick={async () => {
                        const name = slot.selectedNode?.name || slot.selected;
                        if (!name) {
                          toast.error("当前槽位没有可测速节点");
                          return;
                        }
                        try {
                          const result = await delayMutation.mutateAsync({ name });
                          toast.success(
                            result.delay ? `${name} ${result.delay} ms` : `${name} 已完成测速`,
                          );
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "测速失败");
                        }
                      }}
                    >
                      <Gauge className={delayMutation.isPending && delayMutation.variables?.name === slot.selectedNode?.name ? "animate-pulse" : ""} />
                      测速
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={probeMutation.isPending && probeMutation.variables?.slotId === slot.id}
                      onClick={async () => {
                        try {
                          const result = await probeMutation.mutateAsync({ slotId: slot.id });
                          if (result.ok) {
                            toast.success(
                              `端口 ${slot.port} 出口 ${result.country?.code || "-"} ${result.ip || ""}`.trim(),
                            );
                          } else {
                            toast.error(result.error || "出口检测失败");
                          }
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "出口检测失败");
                        }
                      }}
                    >
                      <Radar className={probeMutation.isPending && probeMutation.variables?.slotId === slot.id ? "animate-pulse" : ""} />
                      检测
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="truncate text-sm font-medium" title={slot.selectedNode?.name || slot.selected}>
                    {displayName(slot.selectedNode?.name || slot.selected || "未选择", 42)}
                  </div>
                  <div className="rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                    {slot.egress.ok ? (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{`出口 ${shortCountryLabel(slot.egress.country)} · ${slot.egress.ip}`}</span>
                        <span className="text-border">/</span>
                        <Badge variant={egressPurityTone(slot.egress)} className="px-1.5 py-0 text-[11px]">
                          {`纯净度 ${egressPurityLabel(slot.egress)}`}
                        </Badge>
                        {typeof slot.egress.fraudScore === "number" ? (
                          <>
                            <span className="text-border">/</span>
                            <Badge variant={fraudTone(slot.egress.fraudScore)} className="px-1.5 py-0 text-[11px]">
                              {`风险分 ${slot.egress.fraudScore}`}
                            </Badge>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      "出口待检测"
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">节点池与订阅源</h2>
          <p className="text-sm text-muted-foreground">
            将节点池分布与订阅源摘要放在同一组，方便一起查看来源、规模与健康度。
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
      </section>
    </div>
  );
}
