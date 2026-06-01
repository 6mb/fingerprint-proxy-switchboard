import { toast } from "sonner";
import { SourceEditor } from "@/components/sources/source-editor";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { useSaveSourcesMutation, useSourcesQuery } from "@/hooks/use-panel-data";

export default function SourcesPage() {
  const sourcesQuery = useSourcesQuery();
  const saveMutation = useSaveSourcesMutation();

  if (sourcesQuery.isLoading) {
    return <QueryState title="正在加载订阅源" description="正在读取当前订阅配置。" loading />;
  }

  if (sourcesQuery.isError) {
    return <QueryState title="订阅源加载失败" description={sourcesQuery.error.message} />;
  }

  const data = sourcesQuery.data!;
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="订阅源"
        description="集中维护本地文件、订阅链接与 URL 文件，并支持保存后立即重载。"
      />

      <SourceEditor
        key={JSON.stringify(
          data.sources.map((source) => [source.id, source.name, source.kind, source.preview, source.enabled]),
        )}
        sources={data.sources}
        sourcesPath={data.sourcesPath}
        saving={saveMutation.isPending ? (saveMutation.variables?.reload ? "reload" : "save") : null}
        onSave={async (sources, reload) => {
          try {
            const result = await saveMutation.mutateAsync({ sources, reload });
            const failed = result.generated?.source_errors?.length || 0;
            if (reload && failed) {
              toast.warning(`订阅已保存，${failed} 个源拉取失败`);
            } else if (reload) {
              toast.success("订阅已保存并重载");
            } else {
              toast.success("订阅已保存");
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "保存失败");
          }
        }}
      />
    </div>
  );
}
