import type { Agent } from "../types/agent";
import AgentCard from "./agent-card";

interface Props {
  agents: Agent[];
}

export default function AgentList({ agents }: Props) {
  if (agents.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No agents registered.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
