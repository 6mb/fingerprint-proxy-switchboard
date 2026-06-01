import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NodeTable } from "@/components/nodes/node-table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { Select } from "@/components/ui/select";
import { useSingleDelayMutation, useStatusQuery } from "@/hooks/use-panel-data";
import { countriesFor, normalizeCountry } from "@/lib/panel";

const pageSize = 30;

export default function NodesPage() {
  const statusQuery = useStatusQuery();
  const delayMutation = useSingleDelayMutation();
  const [country, setCountry] = useState("ALL");
  const [page, setPage] = useState(1);

  const rawData = statusQuery.data;

  const countries = useMemo(() => countriesFor(rawData?.nodes || []), [rawData?.nodes]);
  const filteredNodes = useMemo(() => {
    const nodes = rawData?.nodes || [];
    if (country === "ALL") return nodes;
    return nodes.filter((node) => normalizeCountry(node.country).code === country);
  }, [country, rawData?.nodes]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedNodes = filteredNodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (statusQuery.isLoading) {
    return <QueryState title="正在加载节点池" description="正在整理节点状态与国家分布。" loading />;
  }

  if (statusQuery.isError) {
    return <QueryState title="节点池加载失败" description={statusQuery.error.message} />;
  }

  const data = rawData!;
  const total = data.nodes.length;
  const tested = data.nodes.filter((node) => node.status !== "untested").length;
  const healthy = data.nodes.filter((node) => node.status === "ok").length;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="节点池"
        description="统一查看节点健康度、来源与国家分布，并支持逐个测速。"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            国家筛选
          </div>
          <Select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">所有国家</option>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-4">
          <Badge variant="outline">总数 {total}</Badge>
          <Badge variant="outline">已测速 {tested}</Badge>
          <Badge variant="outline">可用 {healthy}</Badge>
          <Badge variant="outline">
            第 {currentPage} / {totalPages} 页
          </Badge>
        </div>
      </div>

      <NodeTable
        nodes={pagedNodes}
        testingName={delayMutation.variables?.name ?? null}
        onTest={async (node) => {
          try {
            const result = await delayMutation.mutateAsync({ name: node.name });
            toast.success(
              result.delay ? `${node.name} ${result.delay} ms` : `${node.name} 已完成测速`,
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "测速失败");
          }
        }}
      />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          上一页
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
