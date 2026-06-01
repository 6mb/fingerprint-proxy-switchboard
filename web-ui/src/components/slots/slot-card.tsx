import { ArrowRightLeft, Gauge, Globe2, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { countriesFor, displayName, normalizeCountry, shortCountryLabel, sortNodes, statusLabel, statusTone } from "@/lib/panel";
import type { SlotInfo } from "@/types/api";

export function SlotCard({
  slot,
  onSelect,
  onTest,
  selecting,
  testing,
}: {
  slot: SlotInfo;
  onSelect: (slotId: number, name: string) => Promise<void>;
  onTest: (name: string) => Promise<void>;
  selecting: boolean;
  testing: boolean;
}) {
  const [country, setCountry] = useState("ALL");
  const [selectedName, setSelectedName] = useState(slot.selected || "");

  const filteredChoices = useMemo(() => {
    const choices = country === "ALL"
      ? slot.choiceDetails
      : slot.choiceDetails.filter(
          (node) => normalizeCountry(node.country).code === country,
        );
    return sortNodes(choices, "delay-asc");
  }, [country, slot.choiceDetails]);

  const countries = useMemo(() => countriesFor(slot.choiceDetails), [slot.choiceDetails]);
  const activeSelectedName = useMemo(() => {
    if (filteredChoices.some((node) => node.name === selectedName)) {
      return selectedName;
    }
    return filteredChoices[0]?.name || "";
  }, [filteredChoices, selectedName]);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>端口 {slot.port}</CardTitle>
            <CardDescription className="break-all">
              {slot.name} · 当前 {displayName(slot.selected || "未选择", 42)}
            </CardDescription>
          </div>
          <Badge variant={statusTone(slot.selectedNode)}>{statusLabel(slot.selectedNode)}</Badge>
        </div>

        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <Globe2 className="size-3.5" />
            <span className="font-medium text-foreground">HTTP</span>
            <code className="truncate">{slot.http}</code>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <Globe2 className="size-3.5" />
            <span className="font-medium text-foreground">SOCKS5</span>
            <code className="truncate">{slot.socks5}</code>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-3.5" />
            当前节点状态
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{slot.selectedNode?.name || "未选择节点"}</div>
              <div className="text-xs text-muted-foreground">
                {slot.selectedNode
                  ? `${shortCountryLabel(slot.selectedNode.country)} · ${slot.selectedNode.type || "proxy"}`
                  : "尚未绑定节点"}
              </div>
            </div>
            <Badge variant={statusTone(slot.selectedNode)}>{statusLabel(slot.selectedNode)}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            国家筛选
          </label>
          <Select
            value={country}
            onChange={(event) => {
              const nextCountry = event.target.value;
              setCountry(nextCountry);
              const nextChoices = sortNodes(
                (nextCountry === "ALL"
                  ? slot.choiceDetails
                  : slot.choiceDetails.filter(
                      (node) => normalizeCountry(node.country).code === nextCountry,
                    )),
                "delay-asc",
              );
              setSelectedName((current) =>
                nextChoices.some((node) => node.name === current)
                  ? current
                  : (nextChoices[0]?.name || ""),
              );
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

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            节点选择
          </label>
          <Select value={activeSelectedName} onChange={(event) => setSelectedName(event.target.value)}>
            {filteredChoices.length ? null : <option value="">当前筛选下没有节点</option>}
            {filteredChoices.map((node) => (
              <option key={node.name} value={node.name}>
                {displayName(node.name, 46)} · {shortCountryLabel(node.country)} · {statusLabel(node)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1"
            disabled={selecting || !activeSelectedName}
            onClick={async () => {
              if (!activeSelectedName) {
                toast.error("当前筛选下没有可切换节点");
                return;
              }
              await onSelect(slot.id, activeSelectedName);
            }}
          >
            <ArrowRightLeft />
            切换节点
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={testing || !activeSelectedName}
            onClick={async () => {
              if (!activeSelectedName) {
                toast.error("当前筛选下没有可测速节点");
                return;
              }
              await onTest(activeSelectedName);
            }}
          >
            <TimerReset />
            测速当前
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
