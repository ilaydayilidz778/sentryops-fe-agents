export interface Agent {
  id: string;
  name: string;
  type: "orchestrator" | "deep_analysis" | "fix_suggestion" | "scanner";
  status: "active" | "idle" | "offline" | "error";
  capabilities: string[];
  lastHeartbeat: string;
  currentTaskId: string | null;
  version: string;
  uptime: string;
}

export const mockAgents: Agent[] = [
  {
    id: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    name: "SecurityOrchestrator-01",
    type: "orchestrator",
    status: "active",
    capabilities: ["scan_dispatch", "result_aggregation", "policy_enforcement"],
    lastHeartbeat: "2026-03-08T11:59:55Z",
    currentTaskId: "task-8a7b6c5d",
    version: "2.1.0",
    uptime: "14d 6h 32m",
  },
  {
    id: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    name: "DeepAnalysisAgent-01",
    type: "deep_analysis",
    status: "active",
    capabilities: ["llm_analysis", "cwe_classification", "false_positive_detection"],
    lastHeartbeat: "2026-03-08T11:59:52Z",
    currentTaskId: "task-9b8c7d6e",
    version: "2.1.0",
    uptime: "14d 6h 32m",
  },
  {
    id: "ag3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    name: "FixSuggestionAgent-01",
    type: "fix_suggestion",
    status: "idle",
    capabilities: ["code_fix_generation", "pr_creation", "patch_validation"],
    lastHeartbeat: "2026-03-08T11:59:58Z",
    currentTaskId: null,
    version: "2.1.0",
    uptime: "14d 6h 32m",
  },
  {
    id: "ag4d5e6f-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    name: "ScannerAgent-Semgrep",
    type: "scanner",
    status: "idle",
    capabilities: ["sast_scan", "custom_rules"],
    lastHeartbeat: "2026-03-08T11:59:50Z",
    currentTaskId: null,
    version: "2.0.5",
    uptime: "7d 2h 15m",
  },
  {
    id: "ag5e6f7a-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    name: "ScannerAgent-Gitleaks",
    type: "scanner",
    status: "offline",
    capabilities: ["secret_scan"],
    lastHeartbeat: "2026-03-07T23:45:00Z",
    currentTaskId: null,
    version: "2.0.5",
    uptime: "0d 0h 0m",
  },
];
