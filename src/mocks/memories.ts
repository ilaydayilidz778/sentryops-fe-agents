export interface Memory {
  id: string;
  agentId: string;
  agentName: string;
  type: "pattern" | "context" | "decision" | "feedback";
  scope: "global" | "repository" | "scan";
  key: string;
  value: unknown;
  visibility: "shared" | "private";
  createdAt: string;
  updatedAt: string;
  ttl: string | null;
}

export const mockMemories: Memory[] = [
  {
    id: "mem1a2b3-c4d5-4e6f-7a8b-9c0d1e2f3a4b",
    agentId: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    agentName: "DeepAnalysisAgent-01",
    type: "pattern",
    scope: "global",
    key: "false_positive_patterns",
    value: {
      patterns: [
        { rule: "sql-injection", context: "ORM parameterized query", confidence: 0.95 },
        { rule: "xss-reflected", context: "React JSX auto-escape", confidence: 0.92 },
      ],
    },
    visibility: "shared",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-03-07T14:30:00Z",
    ttl: null,
  },
  {
    id: "mem2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
    agentId: "ag3c4d5e-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    agentName: "FixSuggestionAgent-01",
    type: "context",
    scope: "repository",
    key: "sentryops/api-service:code_style",
    value: {
      language: "python",
      framework: "fastapi",
      style: { imports: "absolute", typing: "strict", async: true },
    },
    visibility: "shared",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-08T02:03:00Z",
    ttl: "30d",
  },
  {
    id: "mem3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d",
    agentId: "ag1a2b3c-d4e5-4f6a-7b8c-9d0e1f2a3b4c",
    agentName: "SecurityOrchestrator-01",
    type: "decision",
    scope: "scan",
    key: "scan:sc1a2b3c:routing_decision",
    value: {
      totalFindings: 12,
      criticalCount: 2,
      routedToDeepAnalysis: 5,
      routedToFixSuggestion: 3,
      autoDismissed: 4,
    },
    visibility: "private",
    createdAt: "2026-03-08T02:00:30Z",
    updatedAt: "2026-03-08T02:00:30Z",
    ttl: "7d",
  },
  {
    id: "mem4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e",
    agentId: "ag2b3c4d-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    agentName: "DeepAnalysisAgent-01",
    type: "feedback",
    scope: "global",
    key: "developer_feedback_summary",
    value: {
      totalFeedbacks: 48,
      falsePositiveRate: 0.12,
      helpfulFixRate: 0.87,
      topDismissedRules: ["react-dangerouslySetInnerHTML", "hardcoded-credentials-test"],
    },
    visibility: "shared",
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-03-08T10:00:00Z",
    ttl: null,
  },
];
