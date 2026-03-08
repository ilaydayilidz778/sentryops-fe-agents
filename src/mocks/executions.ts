export interface Execution {
  id: string;
  agentId: string;
  agentName: string;
  scanId: string;
  parentExecutionId: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  duration: string | null;
  llmTokensUsed: number;
  llmCost: number;
  findingsProcessed: number;
  delegatedTo: string[];
}

export const mockExecutions: Execution[] = [
  {
    id: "ex1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    agentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    agentName: "SecurityOrchestrator-01",
    scanId: "sc1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    parentExecutionId: null,
    status: "completed",
    startedAt: "2026-03-08T02:00:00Z",
    completedAt: "2026-03-08T02:03:42Z",
    duration: "3m 42s",
    llmTokensUsed: 15420,
    llmCost: 0.046,
    findingsProcessed: 12,
    delegatedTo: ["ex2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d"],
  },
  {
    id: "ex2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    agentId: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    agentName: "DeepAnalysisAgent-01",
    scanId: "sc1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    parentExecutionId: "ex1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    status: "completed",
    startedAt: "2026-03-08T02:01:15Z",
    completedAt: "2026-03-08T02:03:30Z",
    duration: "2m 15s",
    llmTokensUsed: 42800,
    llmCost: 0.128,
    findingsProcessed: 5,
    delegatedTo: ["ex3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e"],
  },
  {
    id: "ex3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    agentId: "ag3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    agentName: "FixSuggestionAgent-01",
    scanId: "sc1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    parentExecutionId: "ex2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    status: "completed",
    startedAt: "2026-03-08T02:02:30Z",
    completedAt: "2026-03-08T02:03:25Z",
    duration: "55s",
    llmTokensUsed: 18600,
    llmCost: 0.056,
    findingsProcessed: 3,
    delegatedTo: [],
  },
  {
    id: "ex4d5e6f-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    agentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    agentName: "SecurityOrchestrator-01",
    scanId: "sc2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    parentExecutionId: null,
    status: "running",
    startedAt: "2026-03-08T11:55:00Z",
    completedAt: null,
    duration: null,
    llmTokensUsed: 3200,
    llmCost: 0.010,
    findingsProcessed: 0,
    delegatedTo: [],
  },
];
