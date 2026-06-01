import { Plus, Save, Trash2, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { SourceRecord } from "@/types/api";

interface EditableSource extends SourceRecord {
  rowId: string;
}

function makeRowId(source: SourceRecord, index: number) {
  return `${source.id ?? "new"}-${index}-${source.name || "source"}`;
}

function toEditable(source: SourceRecord, index: number): EditableSource {
  return {
    ...source,
    rowId: makeRowId(source, index),
  };
}

export function SourceEditor({
  sources,
  sourcesPath,
  saving,
  onSave,
}: {
  sources: SourceRecord[];
  sourcesPath: string;
  saving: "save" | "reload" | null;
  onSave: (
    payload: Array<{
      id: number | null;
      name: string;
      kind: "path" | "url" | "url_file";
      value: string;
      enabled: boolean;
      keep: boolean;
    }>,
    reload: boolean,
  ) => Promise<void>;
}) {
  const [rows, setRows] = useState<EditableSource[]>(() => sources.map(toEditable));

  const rowCount = rows.length;

  const payload = useMemo(() => {
    return rows.map((row, index) => ({
      id: row.id,
      name: row.name.trim() || `source-${index + 1}`,
      kind: row.kind,
      value: row.value.trim(),
      enabled: row.enabled,
      keep: row.kind === "url" && row.value.trim() === "" && row.saved,
    }));
  }, [rows]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>订阅源管理</CardTitle>
          <CardDescription>
            当前共 {rowCount} 个订阅源，保存路径 {sourcesPath || "-"}。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {rows.map((row) => (
              <div
                key={row.rowId}
                className="grid gap-3 rounded-lg border border-border p-4 xl:grid-cols-[auto_1.2fr_0.8fr_1.4fr_1fr_auto]"
              >
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setRows((current) =>
                        current.map((item) =>
                          item.rowId === row.rowId ? { ...item, enabled } : item,
                        ),
                      );
                    }}
                  />
                  启用
                </label>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    名称
                  </div>
                  <Input
                    value={row.name}
                    placeholder="例如 hytron"
                    onChange={(event) => {
                      const name = event.target.value;
                      setRows((current) =>
                        current.map((item) =>
                          item.rowId === row.rowId ? { ...item, name } : item,
                        ),
                      );
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    类型
                  </div>
                  <Select
                    value={row.kind}
                    onChange={(event) => {
                      const kind = event.target.value as EditableSource["kind"];
                      setRows((current) =>
                        current.map((item) =>
                          item.rowId === row.rowId ? { ...item, kind } : item,
                        ),
                      );
                    }}
                  >
                    <option value="path">本地文件</option>
                    <option value="url">订阅链接</option>
                    <option value="url_file">URL 文件</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    输入值
                  </div>
                  <Input
                    value={row.value}
                    placeholder={
                      row.kind === "path"
                        ? "/app/config/source.yaml"
                        : "粘贴新订阅链接；留空则保留已保存链接"
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      setRows((current) =>
                        current.map((item) =>
                          item.rowId === row.rowId ? { ...item, value } : item,
                        ),
                      );
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    已保存预览
                  </div>
                  <div className="min-h-10 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    {row.preview || "未保存"}
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setRows((current) =>
                        current.filter((item) => item.rowId !== row.rowId),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: null,
                    name: "",
                    kind: "url",
                    value: "",
                    preview: "新订阅",
                    enabled: true,
                    saved: false,
                    rowId: `new-${Date.now()}`,
                  },
                ])
              }
            >
              <Plus />
              添加订阅
            </Button>
            <Button disabled={saving !== null} onClick={() => onSave(payload, false)}>
              <Save />
              保存订阅
            </Button>
            <Button
              disabled={saving !== null}
              onClick={() => onSave(payload, true)}
            >
              <Zap />
              保存并重载
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
