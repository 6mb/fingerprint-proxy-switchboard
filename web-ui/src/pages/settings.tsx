import { toast } from "sonner";
import { PanelSettingsForm } from "@/components/settings/panel-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import { usePanelSettingsQuery, useSavePanelSettingsMutation } from "@/hooks/use-panel-data";

export default function SettingsPage() {
  const panelSettingsQuery = usePanelSettingsQuery();
  const saveMutation = useSavePanelSettingsMutation();

  if (panelSettingsQuery.isLoading) {
    return <QueryState title="正在加载系统配置" description="正在读取槽位与端口设置。" loading />;
  }

  if (panelSettingsQuery.isError) {
    return <QueryState title="系统配置加载失败" description={panelSettingsQuery.error.message} />;
  }

  const data = panelSettingsQuery.data!;

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="系统配置"
        description="在后台直接维护槽位数量与端口列表，无需手动登录服务器修改环境变量。"
      />

      <PanelSettingsForm
        key={`${data.settingsPath}-${data.slotPorts.join(",")}`}
        settings={data}
        saving={saveMutation.isPending}
        onSave={async (slotPorts) => {
          try {
            const result = await saveMutation.mutateAsync({ slotPorts });
            const failed = result.generated?.source_errors?.length || 0;
            if (failed) {
              toast.warning(`端口配置已保存，${failed} 个订阅源重载失败`);
            } else {
              toast.success(`端口配置已保存，当前 ${result.settings.slotCount} 个槽位`);
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "保存失败");
          }
        }}
      />
    </div>
  );
}
