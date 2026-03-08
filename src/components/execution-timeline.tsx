import type { Execution } from "../types/agent";

const statusColor: Record<Execution["status"], string> = {
  running: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
  cancelled: "text-gray-400",
};

interface Props {
  executions: Execution[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ExecutionTimeline({ executions, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400">
            <th className="py-3 pr-4">Agent</th>
            <th className="py-3 pr-4">Scan ID</th>
            <th className="py-3 pr-4">Phase</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Duration</th>
            <th className="py-3 pr-4">LLM Tokens</th>
            <th className="py-3">Cost</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((ex) => (
            <tr
              key={ex.id}
              onClick={() => onSelect(ex.id)}
              className={`cursor-pointer border-b border-gray-800/50 transition-colors hover:bg-gray-800/30 ${selectedId === ex.id ? "bg-pink-500/5" : ""}`}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  {ex.parentExecutionId && (
                    <span className="text-gray-600">&#8627;</span>
                  )}
                  <span className="text-gray-100">{ex.agentName}</span>
                </div>
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-gray-400">
                {ex.scanId.slice(0, 12)}
              </td>
              <td className="py-3 pr-4 text-gray-400">
                {ex.parentExecutionId ? "Delegated" : "Root"}
              </td>
              <td className={`py-3 pr-4 font-medium ${statusColor[ex.status]}`}>
                {ex.status}
              </td>
              <td className="py-3 pr-4 text-gray-400">{ex.duration ?? "..."}</td>
              <td className="py-3 pr-4 text-gray-300">
                {ex.llmTokensUsed.toLocaleString()}
              </td>
              <td className="py-3 text-gray-300">${ex.llmCost.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
