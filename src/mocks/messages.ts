export interface A2AMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  type: "task_delegation" | "result_report" | "status_update" | "error_report";
  payload: Record<string, unknown>;
  timestamp: string;
}

export const mockMessages: A2AMessage[] = [
  {
    id: "msg1a2b3-c4d5-4e6f-7a8b-9c0d1e2f3a4b",
    fromAgentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    fromAgentName: "SecurityOrchestrator-01",
    toAgentId: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    toAgentName: "DeepAnalysisAgent-01",
    type: "task_delegation",
    payload: { scanId: "sc1a2b3c", findingIds: ["f1", "f2", "f3", "f4", "f5"], priority: "high" },
    timestamp: "2026-03-08T02:01:10Z",
  },
  {
    id: "msg2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
    fromAgentId: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    fromAgentName: "DeepAnalysisAgent-01",
    toAgentId: "ag3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    toAgentName: "FixSuggestionAgent-01",
    type: "task_delegation",
    payload: { scanId: "sc1a2b3c", confirmedFindingIds: ["f1", "f3", "f5"], fixable: true },
    timestamp: "2026-03-08T02:02:25Z",
  },
  {
    id: "msg3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d",
    fromAgentId: "ag3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    fromAgentName: "FixSuggestionAgent-01",
    toAgentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    toAgentName: "SecurityOrchestrator-01",
    type: "result_report",
    payload: { scanId: "sc1a2b3c", fixesGenerated: 3, patchesReady: true },
    timestamp: "2026-03-08T02:03:20Z",
  },
  {
    id: "msg4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e",
    fromAgentId: "ag5e6f7a-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    fromAgentName: "ScannerAgent-Gitleaks",
    toAgentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    toAgentName: "SecurityOrchestrator-01",
    type: "error_report",
    payload: { error: "Connection timeout", retryCount: 3, lastAttempt: "2026-03-07T23:44:50Z" },
    timestamp: "2026-03-07T23:45:00Z",
  },
];
