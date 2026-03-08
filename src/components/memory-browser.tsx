import { useState } from "react";
import type { Memory, MemoryType, MemoryScope, MemoryVisibility } from "../types/agent";
import MemoryDetail from "./memory-detail";

interface Props {
  memories: Memory[];
}

const typeOptions: MemoryType[] = ["pattern", "context", "decision", "feedback"];
const scopeOptions: MemoryScope[] = ["global", "repository", "scan"];
const visibilityOptions: MemoryVisibility[] = ["shared", "private"];

const typeBadge: Record<MemoryType, string> = {
  pattern: "bg-pink-500/15 text-pink-400",
  context: "bg-fuchsia-500/15 text-fuchsia-400",
  decision: "bg-violet-500/15 text-violet-400",
  feedback: "bg-cyan-500/15 text-cyan-400",
};

export default function MemoryBrowser({ memories }: Props) {
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<MemoryVisibility | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = memories.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (scopeFilter !== "all" && m.scope !== scopeFilter) return false;
    if (visibilityFilter !== "all" && m.visibility !== visibilityFilter) return false;
    return true;
  });

  const selected = memories.find((m) => m.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as MemoryType | "all")}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-pink-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as MemoryScope | "all")}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-pink-500 focus:outline-none"
        >
          <option value="all">All Scopes</option>
          {scopeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as MemoryVisibility | "all")}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-pink-500 focus:outline-none"
        >
          <option value="all">All Visibility</option>
          {visibilityOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No memories match the filters.</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === m.id ? "border-pink-500/40 bg-pink-500/5" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[m.type]}`}>{m.type}</span>
                <span className="text-xs text-gray-500">{m.scope}</span>
              </div>
              <p className="text-sm font-medium text-gray-200">{m.key}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>{m.agentName}</span>
                <span className={m.visibility === "shared" ? "text-green-400" : "text-yellow-400"}>
                  {m.visibility}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <MemoryDetail memory={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}
