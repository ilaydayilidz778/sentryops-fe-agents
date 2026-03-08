import type { Agent } from "../types/agent";

const statusDot: Record<Agent["status"], string> = {
  active: "bg-green-400",
  idle: "bg-yellow-400",
  offline: "bg-gray-500",
  error: "bg-red-400",
};

const typeBadge: Record<Agent["type"], string> = {
  orchestrator: "bg-pink-500/15 text-pink-400",
  deep_analysis: "bg-fuchsia-500/15 text-fuchsia-400",
  fix_suggestion: "bg-violet-500/15 text-violet-400",
  scanner: "bg-cyan-500/15 text-cyan-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  agent: Agent;
}

export default function AgentCard({ agent }: Props) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-pink-500/30">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">{agent.name}</h3>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${typeBadge[agent.type]}`}>
            {agent.type.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusDot[agent.status]}`} />
          <span className="text-xs text-gray-400">{agent.status}</span>
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs text-gray-500">Capabilities</p>
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span key={cap} className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-300">
              {cap}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>v{agent.version}</span>
        <span>Heartbeat: {timeAgo(agent.lastHeartbeat)}</span>
      </div>

      {agent.currentTaskId && (
        <div className="mt-2 rounded bg-pink-500/10 px-2 py-1 text-xs text-pink-400">
          Task: {agent.currentTaskId}
        </div>
      )}
    </div>
  );
}
