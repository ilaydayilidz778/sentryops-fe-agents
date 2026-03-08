import { useState } from "react";
import { useAgents } from "../hooks/use-agents";
import { useExecutions } from "../hooks/use-executions";
import { useMemories } from "../hooks/use-memories";
import { useA2AMessages } from "../hooks/use-a2a-messages";
import AgentList from "../components/agent-list";
import ExecutionTimeline from "../components/execution-timeline";
import ExecutionDetail from "../components/execution-detail";
import MemoryBrowser from "../components/memory-browser";
import A2AMessageLog from "../components/a2a-message-log";
import OrchestrationDiagram from "../components/orchestration-diagram";

const tabs = ["Registry", "Orchestration", "Executions", "Memories", "A2A Messages"] as const;
type Tab = (typeof tabs)[number];

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Registry");
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const { data: agents = [] } = useAgents();
  const { data: executions = [] } = useExecutions();
  const { data: memories = [] } = useMemories();
  const { data: messages = [] } = useA2AMessages();

  const selectedExecution = executions.find((e) => e.id === selectedExecutionId) ?? null;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-100">Agents</h1>

        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedExecutionId(null);
              }}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-pink-500 text-pink-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Registry" && <AgentList agents={agents} />}

        {activeTab === "Orchestration" && <OrchestrationDiagram />}

        {activeTab === "Executions" && (
          <div className="space-y-4">
            <ExecutionTimeline
              executions={executions}
              selectedId={selectedExecutionId}
              onSelect={setSelectedExecutionId}
            />
            {selectedExecution && <ExecutionDetail execution={selectedExecution} />}
          </div>
        )}

        {activeTab === "Memories" && <MemoryBrowser memories={memories} />}

        {activeTab === "A2A Messages" && <A2AMessageLog messages={messages} />}
      </div>
    </div>
  );
}
