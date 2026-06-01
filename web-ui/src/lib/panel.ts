import type { CountryInfo, DelayResult, NodeInfo, SlotInfo } from "@/types/api";

const nodeNameMax = 34;

export function displayName(name: string, max = nodeNameMax) {
  const chars = Array.from(name || "");
  if (chars.length <= max) return chars.join("");
  return `${chars.slice(0, max - 3).join("")}...`;
}

export function normalizeCountry(country?: CountryInfo | null) {
  const code = country?.code && country.code !== "UNKNOWN" ? country.code : "OTHER";
  const name = country?.name && country.name !== "Unknown" ? country.name : "其他地区";
  return {
    code,
    name: code === "OTHER" ? "其他地区" : name,
  };
}

export function shortCountryLabel(country?: CountryInfo | null) {
  const normalized = normalizeCountry(country);
  return normalized.code === "OTHER" ? normalized.name : normalized.code;
}

export function countryOptionLabel(country?: CountryInfo | null) {
  const normalized = normalizeCountry(country);
  return `${normalized.name} (${normalized.code})`;
}

export function countriesFor(nodes: NodeInfo[]) {
  const countries = new Map<string, string>();
  for (const node of nodes) {
    const country = normalizeCountry(node.country);
    countries.set(country.code, country.name);
  }

  return [...countries.entries()].sort((a, b) => {
    if (a[0] === "OTHER") return 1;
    if (b[0] === "OTHER") return -1;
    return a[1].localeCompare(b[1], "zh-CN");
  });
}

export function statusLabel(node?: Pick<NodeInfo, "delay" | "status"> | null) {
  if (!node) return "未测速";
  if (Number.isInteger(node.delay)) return `${node.delay} ms`;
  if (node.status === "error") return "异常";
  if (node.status === "down") return "不可用";
  return "未测速";
}

export function statusTone(node?: Pick<NodeInfo, "delay" | "status"> | null) {
  if (!node) return "unknown" as const;
  if (typeof node.delay === "number" && Number.isInteger(node.delay)) {
    if (node.delay <= 120) return "good" as const;
    if (node.delay <= 260) return "ok" as const;
    return "warn" as const;
  }
  if (node.status === "error" || node.status === "down") return "bad" as const;
  return "unknown" as const;
}

export function delayValue(node?: Pick<NodeInfo, "delay"> | null) {
  return typeof node?.delay === "number" && Number.isInteger(node.delay) ? node.delay : null;
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return "未记录";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function applyDelayPatch(status: {
  nodes: NodeInfo[];
  slots: SlotInfo[];
}, result: DelayResult) {
  const patch = {
    delay: Number.isInteger(result.delay) ? result.delay : null,
    status: result.status,
    updatedAt: result.updatedAt,
    error: result.error || "",
  };

  const updateNode = (node?: NodeInfo | null) => {
    if (node?.name === result.name) {
      Object.assign(node, patch);
    }
  };

  status.nodes.forEach(updateNode);
  status.slots.forEach((slot) => {
    updateNode(slot.selectedNode);
    slot.choiceDetails.forEach(updateNode);
  });
}

export function protocolSummary(nodes: NodeInfo[]) {
  const summary = new Map<string, number>();
  for (const node of nodes) {
    const key = node.type || "proxy";
    summary.set(key, (summary.get(key) || 0) + 1);
  }

  return [...summary.entries()].sort((a, b) => b[1] - a[1]);
}

export function sortNodes(nodes: NodeInfo[], mode: "delay-asc" | "delay-desc" | "name-asc" = "delay-asc") {
  return [...nodes].sort((left, right) => {
    if (mode === "name-asc") {
      return left.name.localeCompare(right.name, "zh-CN");
    }

    const leftDelay = delayValue(left);
    const rightDelay = delayValue(right);
    const leftRank = leftDelay ?? (mode === "delay-asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const rightRank = rightDelay ?? (mode === "delay-asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

    if (leftRank !== rightRank) {
      return mode === "delay-asc" ? leftRank - rightRank : rightRank - leftRank;
    }

    if (leftDelay === null && rightDelay !== null) return 1;
    if (leftDelay !== null && rightDelay === null) return -1;
    return left.name.localeCompare(right.name, "zh-CN");
  });
}
