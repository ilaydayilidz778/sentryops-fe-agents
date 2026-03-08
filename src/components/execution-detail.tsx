import type { Execution } from "../types/agent";
import { useDelegationChain } from "../hooks/use-delegation-chain";

interface Props {
  execution: Execution;
}

export default function ExecutionDetail({ execution }: Props) {
  const { data: chain = [] } = useDelegationChain(execution.id);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-100">Execution Detail</h3>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Agent</p>
          <p className="text-gray-200">{execution.agentName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Scan ID</p>
          <p className="font-mono text-xs text-gray-300">{execution.scanId}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Started</p>
          <p className="text-gray-300">{new Date(execution.startedAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Duration</p>
          <p className="text-gray-300">{execution.duration ?? "Running..."}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-800 bg-gray-950 p-4">
        <h4 className="mb-3 text-xs font-medium text-pink-400">LLM Usage</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Provider</p>
            <p className="text-gray-200">Ollama / Claude</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tokens Used</p>
            <p className="text-gray-200">{execution.llmTokensUsed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cost</p>
            <p className="text-gray-200">${execution.llmCost.toFixed(3)}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs text-gray-500">Findings Processed</p>
        <p className="text-sm text-gray-200">{execution.findingsProcessed}</p>
      </div>

      {chain.length > 1 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium text-pink-400">Delegation Chain</h4>
          <div className="space-y-1">
            {chain.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{i > 0 ? "\u2514\u2500" : "\u250C\u2500"}</span>
                <span className="text-gray-300">{c.agentName}</span>
                <span className={`rounded px-1.5 py-0.5 ${c.status === "completed" ? "bg-green-500/10 text-green-400" : c.status === "running" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
