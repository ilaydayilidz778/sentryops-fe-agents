export type AgentType = "orchestrator" | "deep_analysis" | "fix_suggestion" | "scanner";
export type AgentStatus = "active" | "idle" | "offline" | "error";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  lastHeartbeat: string;
  currentTaskId: string | null;
  version: string;
  uptime: string;
}

export type ExecutionStatus = "running" | "completed" | "failed" | "cancelled";

export interface Execution {
  id: string;
  agentId: string;
  agentName: string;
  scanId: string;
  parentExecutionId: string | null;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  duration: string | null;
  llmTokensUsed: number;
  llmCost: number;
  findingsProcessed: number;
  delegatedTo: string[];
}

export type MemoryType = "pattern" | "context" | "decision" | "feedback";
export type MemoryScope = "global" | "repository" | "scan";
export type MemoryVisibility = "shared" | "private";

export interface Memory {
  id: string;
  agentId: string;
  agentName: string;
  type: MemoryType;
  scope: MemoryScope;
  key: string;
  value: unknown;
  visibility: MemoryVisibility;
  createdAt: string;
  updatedAt: string;
  ttl: string | null;
}

export type A2AMessageType = "task_delegation" | "result_report" | "status_update" | "error_report";

export interface A2AMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  type: A2AMessageType;
  payload: Record<string, unknown>;
  timestamp: string;
}
