import { Download } from "lucide-react";
import { toast } from "sonner";
import { SlotCard } from "@/components/slots/slot-card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { useSelectSlotMutation, useSingleDelayMutation, useStatusQuery } from "@/hooks/use-panel-data";

export default function SlotsPage() {
  const statusQuery = useStatusQuery();
  const selectMutation = useSelectSlotMutation();
  const delayMutation = useSingleDelayMutation();

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
        description="每个固定端口都有独立的节点选择与测速操作。"
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
            key={slot.id}
            slot={slot}
            selecting={selectMutation.isPending}
            testing={delayMutation.isPending}
            onSelect={async (slotId, name) => {
              try {
                await selectMutation.mutateAsync({ slotId, name });
                toast.success(`端口 ${slot.port} 已切换到 ${name}`);
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
          />
        ))}
      </div>
    </div>
  );
}
