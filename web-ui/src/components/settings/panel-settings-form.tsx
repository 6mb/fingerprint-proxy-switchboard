import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PanelSettingsResponse } from "@/types/api";

function parsePorts(values: string[]) {
  const ports = values.map((value) => value.trim()).filter(Boolean);
  if (!ports.length) {
    throw new Error("至少保留一个端口");
  }

  const seen = new Set<number>();
  return ports.map((value) => {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`端口 ${value} 无效`);
    }
    if (seen.has(port)) {
      throw new Error(`端口 ${port} 重复`);
    }
    seen.add(port);
    return port;
  });
}

export function PanelSettingsForm({
  settings,
  saving,
  onSave,
}: {
  settings: PanelSettingsResponse;
  saving: boolean;
  onSave: (slotPorts: number[]) => Promise<void>;
}) {
  const [portInputs, setPortInputs] = useState(() => settings.slotPorts.map((port) => String(port)));
  const slotCount = portInputs.map((value) => value.trim()).filter(Boolean).length;
  const preview = useMemo(() => {
    try {
      return parsePorts(portInputs);
    } catch {
      return [];
    }
  }, [portInputs]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>槽位与端口</CardTitle>
            <CardDescription>
              槽位数量由端口列表自动决定。保存后会立即重写配置并重载 Mihomo。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">槽位 {slotCount}</Badge>
            <Badge variant="outline">运行配置文件</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <code className="break-all">{settings.settingsPath}</code>
        </div>

        <div className="grid gap-3">
          {portInputs.map((value, index) => (
            <div key={`${settings.settingsPath}-${index}`} className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
              <div className="flex h-10 items-center text-sm font-medium text-muted-foreground">
                槽位 {index + 1}
              </div>
              <Input
                inputMode="numeric"
                value={value}
                placeholder="例如 6181"
                onChange={(event) => {
                  const next = [...portInputs];
                  next[index] = event.target.value;
                  setPortInputs(next);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                disabled={portInputs.length <= 1}
                onClick={() => {
                  if (portInputs.length <= 1) return;
                  setPortInputs(portInputs.filter((_, rowIndex) => rowIndex !== index));
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPortInputs([...portInputs, ""])}
          >
            <Plus />
            新增端口
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              try {
                await onSave(parsePorts(portInputs));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "保存失败");
              }
            }}
          >
            <Save />
            保存并重载
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide">端口预览</div>
          <div className="flex flex-wrap gap-2">
            {preview.length ? (
              preview.map((port) => (
                <Badge key={port} variant="outline">
                  {port}
                </Badge>
              ))
            ) : (
              <span>请填写有效的唯一端口。</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
