import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { displayName, formatRelativeTime, shortCountryLabel, statusLabel, statusTone } from "@/lib/panel";
import type { NodeInfo } from "@/types/api";

export function NodeTable({
  nodes,
  testingName,
  onTest,
}: {
  nodes: NodeInfo[];
  testingName?: string | null;
  onTest: (node: NodeInfo) => Promise<void>;
}) {
  if (!nodes.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          当前筛选下没有节点。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">节点</th>
              <th className="px-4 py-3 font-medium">国家</th>
              <th className="px-4 py-3 font-medium">协议</th>
              <th className="px-4 py-3 font-medium">来源</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">更新时间</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.name} className="border-t border-border align-middle">
                <td className="px-4 py-3 font-medium" title={node.name}>
                  {displayName(node.name, 44)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {shortCountryLabel(node.country)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{node.type || "proxy"}</td>
                <td className="px-4 py-3 text-muted-foreground">{node.source || "-"}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusTone(node)}>{statusLabel(node)}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatRelativeTime(node.updatedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testingName === node.name}
                    onClick={() => onTest(node)}
                  >
                    <Activity className={testingName === node.name ? "animate-pulse" : ""} />
                    测速
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
