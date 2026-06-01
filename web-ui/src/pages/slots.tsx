import { Download } from "lucide-react";
import { toast } from "sonner";
import { SlotCard } from "@/components/slots/slot-card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { useProbeSlotMutation, useSelectSlotMutation, useSingleDelayMutation, useStatusQuery } from "@/hooks/use-panel-data";

export default function SlotsPage() {
  const statusQuery = useStatusQuery();
  const selectMutation = useSelectSlotMutation();
  const delayMutation = useSingleDelayMutation();
  const probeMutation = useProbeSlotMutation();

  if (statusQuery.isLoading) {
    return <QueryState title="正在加载端口槽位" description="正在读取槽位与节点映射。" loading />;
  }

  if (statusQuery.isError) {
    return <QueryState title="端口槽位加载失败" description={statusQuery.error.message} />;
  }

  const data = statusQuery.data!;
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="端口槽位"
        description="每个自定义端口都有独立的节点选择与测速操作。"
        actions={
          <a
            href="/api/export"
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            )}
          >
            <Download />
            导出端口
          </a>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {data.slots.map((slot) => (
          <SlotCard
            key={`${slot.id}-${slot.selected}-${slot.port}`}
            slot={slot}
            selectingSlotId={selectMutation.isPending ? (selectMutation.variables?.slotId ?? null) : null}
            testingName={delayMutation.isPending ? (delayMutation.variables?.name ?? null) : null}
            probingSlotId={probeMutation.isPending ? (probeMutation.variables?.slotId ?? null) : null}
            onSelect={async (slotId, name) => {
              try {
                await selectMutation.mutateAsync({ slotId, name });
                toast.success(`端口 ${slot.port} 已切换到 ${name}`);
                try {
                  const result = await probeMutation.mutateAsync({ slotId });
                  if (result.ok) {
                    toast.success(
                      `端口 ${slot.port} 出口 ${result.country?.code || "-"} ${result.ip || ""}`.trim(),
                    );
                  } else if (result.error) {
                    toast.warning(`节点已切换，但出口检测失败：${result.error}`);
                  }
                } catch (probeError) {
                  toast.warning(
                    probeError instanceof Error
                      ? `节点已切换，但出口检测失败：${probeError.message}`
                      : "节点已切换，但出口检测失败",
                  );
                }
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "切换失败");
              }
            }}
            onTest={async (name) => {
              try {
                const result = await delayMutation.mutateAsync({ name });
                toast.success(
                  result.delay ? `${name} ${result.delay} ms` : `${name} 已完成测速`,
                );
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "测速失败");
              }
            }}
            onProbe={async (slotId) => {
              try {
                const result = await probeMutation.mutateAsync({ slotId });
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
          />
        ))}
      </div>
    </div>
  );
}
