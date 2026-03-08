import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DataFlowDiagramProps {
  executionId?: string;
  autoPlay?: boolean;
}

type AgentId = "orchestrator" | "deep_analysis" | "fix_suggestion";
type MessageType = "delegate" | "result" | "error" | "heartbeat";
type MemoryOpType = "READ" | "WRITE";
type MemoryVisibility = "PRIVATE" | "SHARED" | "GLOBAL";
type LLMProvider = "ollama" | "claude";
type LLMStrategy = "ollama_first" | "claude_first";

interface A2AMessage {
  id: string;
  from: AgentId;
  to: AgentId;
  type: MessageType;
  payload: Record<string, unknown>;
  timestamp: string;
  latencyMs: number;
}

interface MemoryEntry {
  id: string;
  key: string;
  memoryType: string;
  visibility: MemoryVisibility;
  version: number;
  confidence: number;
  createdBy: AgentId;
  usageCount: number;
  subscribers: AgentId[];
  ttlSeconds: number | null;
  content: Record<string, unknown>;
  versionHistory: { version: number; updatedAt: string; updatedBy: AgentId }[];
}

interface MemoryOp {
  id: string;
  agent: AgentId;
  memoryId: string;
  operation: MemoryOpType;
  timestamp: string;
}

interface LLMCall {
  id: string;
  agent: AgentId;
  strategy: LLMStrategy;
  attempted: LLMProvider;
  used: LLMProvider;
  fallback: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costEstimate: number;
  timestamp: string;
}

type StepKind = "trigger" | "a2a" | "memory" | "llm" | "report";

interface TimelineStep {
  id: number;
  label: string;
  description: string;
  kind: StepKind;
  a2aMessageId?: string;
  memoryOpId?: string;
  llmCallId?: string;
}

/* ------------------------------------------------------------------ */
/*  CSS keyframes injection                                            */
/* ------------------------------------------------------------------ */

const STYLE_ID = "data-flow-diagram-keyframes";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes df-dash {
      to { stroke-dashoffset: -24; }
    }
    @keyframes df-dash-up {
      to { stroke-dashoffset: 24; }
    }
    @keyframes df-glow-pink {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(236,72,153,0.3)); }
      50%      { filter: drop-shadow(0 0 12px rgba(236,72,153,0.7)); }
    }
    @keyframes df-glow-emerald {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.3)); }
      50%      { filter: drop-shadow(0 0 12px rgba(16,185,129,0.7)); }
    }
    @keyframes df-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
    @keyframes df-pulse-ring {
      0%   { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes df-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_A2A_MESSAGES: A2AMessage[] = [
  {
    id: "msg-001",
    from: "orchestrator",
    to: "deep_analysis",
    type: "delegate",
    payload: {
      task: "analyze_findings",
      pr_id: "PR-142",
      findings: [
        { rule: "python.lang.security.injection.sql-injection", severity: "HIGH", file: "src/auth.py", line: 47 },
        { rule: "python.lang.security.injection.xss", severity: "MEDIUM", file: "src/views.py", line: 112 },
      ],
      scan_id: "scan-8a3f",
    },
    timestamp: "2026-03-08T14:32:01.234Z",
    latencyMs: 3,
  },
  {
    id: "msg-002",
    from: "deep_analysis",
    to: "orchestrator",
    type: "result",
    payload: {
      analysis: {
        confirmed_vulnerabilities: 1,
        false_positives: 1,
        severity_adjusted: "HIGH",
        details: "SQL injection in auth.py:47 confirmed. XSS in views.py:112 is a false positive (output is auto-escaped by template engine).",
      },
    },
    timestamp: "2026-03-08T14:32:08.891Z",
    latencyMs: 7657,
  },
  {
    id: "msg-003",
    from: "orchestrator",
    to: "fix_suggestion",
    type: "delegate",
    payload: {
      task: "generate_fix",
      vulnerability: {
        rule: "python.lang.security.injection.sql-injection",
        file: "src/auth.py",
        line: 47,
        context: "cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")",
      },
    },
    timestamp: "2026-03-08T14:32:09.102Z",
    latencyMs: 2,
  },
  {
    id: "msg-004",
    from: "fix_suggestion",
    to: "orchestrator",
    type: "result",
    payload: {
      fix: {
        diff: "- cursor.execute(f\"SELECT * FROM users WHERE id = {user_id}\")\n+ cursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))",
        explanation: "Use parameterized query to prevent SQL injection",
        confidence: 0.95,
      },
    },
    timestamp: "2026-03-08T14:32:14.567Z",
    latencyMs: 5465,
  },
  {
    id: "msg-005",
    from: "orchestrator",
    to: "deep_analysis",
    type: "delegate",
    payload: {
      task: "validate_fix",
      original_finding: { rule: "sql-injection", file: "src/auth.py", line: 47 },
      proposed_fix: "Use parameterized query",
    },
    timestamp: "2026-03-08T14:32:14.890Z",
    latencyMs: 1,
  },
];

const MOCK_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-001",
    key: "scan_strategy:PR-142",
    memoryType: "scan_strategy",
    visibility: "SHARED",
    version: 1,
    confidence: 0.9,
    createdBy: "orchestrator",
    usageCount: 3,
    subscribers: ["deep_analysis", "fix_suggestion"],
    ttlSeconds: 3600,
    content: {
      strategy: "full_scan",
      scanners: ["semgrep", "gitleaks", "trivy"],
      priority: "high",
      pr_context: { files_changed: 12, lines_added: 340, lines_removed: 28 },
    },
    versionHistory: [
      { version: 1, updatedAt: "2026-03-08T14:32:00.500Z", updatedBy: "orchestrator" },
    ],
  },
  {
    id: "mem-002",
    key: "vulnerability_pattern:sql_injection",
    memoryType: "vulnerability_pattern",
    visibility: "GLOBAL",
    version: 3,
    confidence: 0.92,
    createdBy: "deep_analysis",
    usageCount: 14,
    subscribers: ["orchestrator", "fix_suggestion"],
    ttlSeconds: null,
    content: {
      pattern: "f-string SQL queries",
      language: "python",
      common_locations: ["auth.py", "db.py", "queries.py"],
      remediation: "parameterized queries",
      seen_count: 14,
    },
    versionHistory: [
      { version: 1, updatedAt: "2026-02-15T10:00:00Z", updatedBy: "deep_analysis" },
      { version: 2, updatedAt: "2026-02-28T14:20:00Z", updatedBy: "deep_analysis" },
      { version: 3, updatedAt: "2026-03-08T14:32:08.500Z", updatedBy: "deep_analysis" },
    ],
  },
  {
    id: "mem-003",
    key: "false_positive_pattern:xss_template_escaped",
    memoryType: "false_positive_pattern",
    visibility: "GLOBAL",
    version: 2,
    confidence: 0.88,
    createdBy: "deep_analysis",
    usageCount: 7,
    subscribers: ["orchestrator"],
    ttlSeconds: null,
    content: {
      pattern: "XSS flagged in auto-escaped template output",
      framework: "Jinja2",
      false_positive_reason: "Template engine auto-escapes by default",
    },
    versionHistory: [
      { version: 1, updatedAt: "2026-02-20T09:00:00Z", updatedBy: "deep_analysis" },
      { version: 2, updatedAt: "2026-03-08T14:32:08.800Z", updatedBy: "deep_analysis" },
    ],
  },
  {
    id: "mem-004",
    key: "developer_pattern:team-alpha",
    memoryType: "developer_pattern",
    visibility: "SHARED",
    version: 1,
    confidence: 0.75,
    createdBy: "orchestrator",
    usageCount: 2,
    subscribers: ["deep_analysis"],
    ttlSeconds: 86400,
    content: {
      team: "team-alpha",
      common_issues: ["sql_injection", "hardcoded_secrets"],
      avg_fix_time_hours: 4.2,
    },
    versionHistory: [
      { version: 1, updatedAt: "2026-03-01T08:00:00Z", updatedBy: "orchestrator" },
    ],
  },
  {
    id: "mem-005",
    key: "fix_pattern:sql_parameterized",
    memoryType: "fix_pattern",
    visibility: "GLOBAL",
    version: 1,
    confidence: 0.95,
    createdBy: "fix_suggestion",
    usageCount: 9,
    subscribers: ["orchestrator", "deep_analysis"],
    ttlSeconds: null,
    content: {
      vulnerability: "sql_injection",
      fix_type: "parameterized_query",
      languages: ["python", "javascript"],
      success_rate: 0.93,
    },
    versionHistory: [
      { version: 1, updatedAt: "2026-03-08T14:32:14.200Z", updatedBy: "fix_suggestion" },
    ],
  },
];

const MOCK_MEMORY_OPS: MemoryOp[] = [
  { id: "mop-001", agent: "orchestrator", memoryId: "mem-001", operation: "WRITE", timestamp: "2026-03-08T14:32:00.600Z" },
  { id: "mop-002", agent: "deep_analysis", memoryId: "mem-001", operation: "READ", timestamp: "2026-03-08T14:32:01.500Z" },
  { id: "mop-003", agent: "deep_analysis", memoryId: "mem-002", operation: "WRITE", timestamp: "2026-03-08T14:32:08.500Z" },
  { id: "mop-004", agent: "fix_suggestion", memoryId: "mem-002", operation: "READ", timestamp: "2026-03-08T14:32:09.500Z" },
];

const MOCK_LLM_CALLS: LLMCall[] = [
  {
    id: "llm-001",
    agent: "deep_analysis",
    strategy: "ollama_first",
    attempted: "ollama",
    used: "ollama",
    fallback: false,
    inputTokens: 2340,
    outputTokens: 890,
    latencyMs: 4200,
    costEstimate: 0,
    timestamp: "2026-03-08T14:32:03.100Z",
  },
  {
    id: "llm-002",
    agent: "fix_suggestion",
    strategy: "ollama_first",
    attempted: "ollama",
    used: "claude",
    fallback: true,
    inputTokens: 1820,
    outputTokens: 1240,
    latencyMs: 3100,
    costEstimate: 0.0092,
    timestamp: "2026-03-08T14:32:10.200Z",
  },
  {
    id: "llm-003",
    agent: "deep_analysis",
    strategy: "ollama_first",
    attempted: "ollama",
    used: "ollama",
    fallback: false,
    inputTokens: 1100,
    outputTokens: 420,
    latencyMs: 2800,
    costEstimate: 0,
    timestamp: "2026-03-08T14:32:15.100Z",
  },
];

const TIMELINE_STEPS: TimelineStep[] = [
  { id: 1, label: "Scan Trigger", description: "Orchestrator receives webhook for PR #142", kind: "trigger" },
  { id: 2, label: "Store Strategy", description: "Orchestrator writes scan_strategy memory", kind: "memory", memoryOpId: "mop-001" },
  { id: 3, label: "Delegate Analysis", description: "Orchestrator delegates to Deep Analysis", kind: "a2a", a2aMessageId: "msg-001" },
  { id: 4, label: "Read Strategy", description: "Deep Analysis reads scan_strategy from memory", kind: "memory", memoryOpId: "mop-002" },
  { id: 5, label: "LLM Analysis", description: "Deep Analysis calls Ollama for vulnerability analysis", kind: "llm", llmCallId: "llm-001" },
  { id: 6, label: "Store Pattern", description: "Deep Analysis writes vulnerability_pattern memory", kind: "memory", memoryOpId: "mop-003" },
  { id: 7, label: "Return Results", description: "Deep Analysis returns analysis to Orchestrator", kind: "a2a", a2aMessageId: "msg-002" },
  { id: 8, label: "Delegate Fix", description: "Orchestrator delegates to Fix Suggestion", kind: "a2a", a2aMessageId: "msg-003" },
  { id: 9, label: "Read Vuln Pattern", description: "Fix Suggestion reads vulnerability_pattern from memory", kind: "memory", memoryOpId: "mop-004" },
  { id: 10, label: "LLM Fix Gen", description: "Fix Suggestion calls Ollama (fail) -> Claude fallback", kind: "llm", llmCallId: "llm-002" },
  { id: 11, label: "Return Fix", description: "Fix Suggestion returns fix to Orchestrator", kind: "a2a", a2aMessageId: "msg-004" },
  { id: 12, label: "Validate Fix", description: "Orchestrator delegates validation to Deep Analysis", kind: "a2a", a2aMessageId: "msg-005" },
  { id: 13, label: "Compile Report", description: "Orchestrator compiles final security report", kind: "report" },
];

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

const SVG_W = 960;
const SVG_H = 680;

// Agent swim lane geometry
const LANE_Y = 10;
const LANE_H = 320;
const LANE_W = SVG_W / 3;
const LANE_HDR_H = 44;

// Agent lane centers
const ORCH_CX = LANE_W * 0.5;
const DEEP_CX = LANE_W * 1.5;
const FIX_CX = LANE_W * 2.5;

// Memory pool
const MEM_Y = LANE_Y + LANE_H + 20;
const MEM_H = 120;

// External services
const SVC_Y = MEM_Y + MEM_H + 20;
const SVC_H = 70;
const SVC_W = 160;

// Agent names
const AGENT_LABELS: Record<AgentId, string> = {
  orchestrator: "Security Orchestrator",
  deep_analysis: "Deep Analysis",
  fix_suggestion: "Fix Suggestion",
};

const AGENT_CX: Record<AgentId, number> = {
  orchestrator: ORCH_CX,
  deep_analysis: DEEP_CX,
  fix_suggestion: FIX_CX,
};

/* ------------------------------------------------------------------ */
/*  Color constants                                                    */
/* ------------------------------------------------------------------ */

const COLORS = {
  delegate: "#EC4899",
  result: "#10B981",
  error: "#EF4444",
  heartbeat: "#F59E0B",
  memoryWrite: "#D946EF",
  memoryRead: "#3B82F6",
  llm: "#8B5CF6",
  trigger: "#EC4899",
  report: "#10B981",
};

const MEMORY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  vulnerability_pattern: { bg: "bg-red-500/15", text: "text-red-400" },
  false_positive_pattern: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  scan_strategy: { bg: "bg-blue-500/15", text: "text-blue-400" },
  developer_pattern: { bg: "bg-purple-500/15", text: "text-purple-400" },
  fix_pattern: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

const VISIBILITY_ICONS: Record<MemoryVisibility, { icon: string; label: string }> = {
  PRIVATE: { icon: "\uD83D\uDD12", label: "Private" },
  SHARED: { icon: "\uD83D\uDC65", label: "Shared" },
  GLOBAL: { icon: "\uD83C\uDF10", label: "Global" },
};

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    "." + String(d.getMilliseconds()).padStart(3, "0");
}

function prettyJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/* ------------------------------------------------------------------ */
/*  SVG sub-components                                                 */
/* ------------------------------------------------------------------ */

function SwimLaneHeader({ x, label, active }: { x: number; label: string; active: boolean }) {
  return (
    <foreignObject x={x} y={LANE_Y} width={LANE_W} height={LANE_HDR_H}>
      <div
        className={`flex h-full items-center justify-center border-b transition-all duration-500 ${
          active
            ? "border-pink-500/40 bg-pink-500/10"
            : "border-zinc-800 bg-zinc-900/50"
        }`}
      >
        <span
          className={`text-xs font-bold tracking-wide transition-colors duration-500 ${
            active ? "text-pink-400" : "text-gray-500"
          }`}
        >
          {label}
        </span>
        {active && (
          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-pink-400" style={{ animation: "df-pulse 1.5s ease-in-out infinite" }} />
        )}
      </div>
    </foreignObject>
  );
}

interface AnimatedArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed?: boolean;
  active?: boolean;
  dimmed?: boolean;
  label?: string;
  onClick?: () => void;
  curved?: boolean;
}

function AnimatedArrow({
  x1, y1, x2, y2, color, dashed = false, active = false, dimmed = false, label, onClick, curved = false,
}: AnimatedArrowProps) {
  const opacity = dimmed ? 0.15 : active ? 0.9 : 0.35;
  let path: string;
  let labelX: number;
  let labelY: number;

  if (curved) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const cpx = mx;
    const cpy = y1;
    path = `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`;
    labelX = (x1 + cpx + x2) / 3;
    labelY = (y1 + cpy + y2) / 3 - 6;
  } else {
    path = `M${x1},${y1} L${x2},${y2}`;
    labelX = (x1 + x2) / 2;
    labelY = (y1 + y2) / 2 - 6;
  }

  const isDown = y2 > y1;
  const animName = isDown ? "df-dash" : "df-dash-up";

  return (
    <g
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {/* bg track */}
      <path d={path} fill="none" stroke={color} strokeWidth="1" opacity={0.08} />
      {/* main line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeDasharray={dashed ? "6 4" : "none"}
        opacity={opacity}
        style={active ? { animation: `${animName} 0.8s linear infinite` } : undefined}
      />
      {/* moving dot */}
      {active && (
        <circle r="3.5" fill={color} opacity={0.9}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {/* arrowhead */}
      <ArrowHead x={x2} y={y2} fromX={x1} fromY={y1} color={color} opacity={opacity} />
      {/* label */}
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontWeight="600"
          opacity={dimmed ? 0.3 : 0.8}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function ArrowHead({ x, y, fromX, fromY, color, opacity }: { x: number; y: number; fromX: number; fromY: number; color: string; opacity: number }) {
  const angle = Math.atan2(y - fromY, x - fromX);
  const size = 6;
  const p1x = x - size * Math.cos(angle - Math.PI / 6);
  const p1y = y - size * Math.sin(angle - Math.PI / 6);
  const p2x = x - size * Math.cos(angle + Math.PI / 6);
  const p2y = y - size * Math.sin(angle + Math.PI / 6);
  return (
    <polygon
      points={`${x},${y} ${p1x},${p1y} ${p2x},${p2y}`}
      fill={color}
      opacity={opacity}
    />
  );
}

function ServiceBox({ x, y, label, sublabel, color }: { x: number; y: number; label: string; sublabel: string; color: string }) {
  return (
    <foreignObject x={x - SVC_W / 2} y={y} width={SVC_W} height={SVC_H}>
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-900/80 px-3 py-2">
        <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
        <span className="mt-1 text-[9px] text-gray-500">{sublabel}</span>
      </div>
    </foreignObject>
  );
}

/* ------------------------------------------------------------------ */
/*  Inspector panels                                                   */
/* ------------------------------------------------------------------ */

function MessageInspector({ message, onClose }: { message: A2AMessage; onClose: () => void }) {
  const typeColors: Record<MessageType, string> = {
    delegate: "text-pink-400 bg-pink-500/15",
    result: "text-emerald-400 bg-emerald-500/15",
    error: "text-red-400 bg-red-500/15",
    heartbeat: "text-amber-400 bg-amber-500/15",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" style={{ animation: "df-fade-in 0.25s ease-out" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-100">Message Inspector</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${typeColors[message.type]}`}>
            {message.type.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="text-[10px] text-gray-500 hover:text-gray-300">Close</button>
      </div>
      <div className="grid grid-cols-4 gap-3 text-[11px] mb-3">
        <div>
          <p className="text-gray-500 mb-0.5">From</p>
          <p className="text-gray-200 font-medium">{AGENT_LABELS[message.from]}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">To</p>
          <p className="text-gray-200 font-medium">{AGENT_LABELS[message.to]}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Timestamp</p>
          <p className="text-gray-200 font-mono">{formatTimestamp(message.timestamp)}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Latency</p>
          <p className="text-gray-200 font-mono">{message.latencyMs}ms</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 mb-1">Payload</p>
        <pre className="max-h-40 overflow-auto rounded-lg bg-zinc-950 p-3 text-[10px] text-gray-300 font-mono leading-relaxed">
          {prettyJSON(message.payload)}
        </pre>
      </div>
    </div>
  );
}

function MemoryInspector({ memory, onClose }: { memory: MemoryEntry; onClose: () => void }) {
  const typeStyle = MEMORY_TYPE_COLORS[memory.memoryType] ?? { bg: "bg-zinc-700/30", text: "text-gray-400" };
  const vis = VISIBILITY_ICONS[memory.visibility];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" style={{ animation: "df-fade-in 0.25s ease-out" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-100">Memory Inspector</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
            {memory.memoryType}
          </span>
          <span className="rounded px-1.5 py-0.5 text-[10px] bg-zinc-800 text-gray-400">
            {vis.icon} {vis.label}
          </span>
        </div>
        <button onClick={onClose} className="text-[10px] text-gray-500 hover:text-gray-300">Close</button>
      </div>
      <div className="grid grid-cols-5 gap-3 text-[11px] mb-3">
        <div>
          <p className="text-gray-500 mb-0.5">Created By</p>
          <p className="text-gray-200 font-medium">{AGENT_LABELS[memory.createdBy]}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Version</p>
          <p className="text-gray-200 font-mono">v{memory.version}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Confidence</p>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-pink-500"
                style={{ width: `${memory.confidence * 100}%` }}
              />
            </div>
            <span className="text-gray-400 text-[10px]">{(memory.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Usage Count</p>
          <p className="text-gray-200 font-mono">{memory.usageCount}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">TTL</p>
          <p className="text-gray-200 font-mono">{memory.ttlSeconds ? `${memory.ttlSeconds}s` : "None"}</p>
        </div>
      </div>
      <div className="mb-3">
        <p className="text-[10px] text-gray-500 mb-1">Subscribers</p>
        <div className="flex gap-1">
          {memory.subscribers.map((s) => (
            <span key={s} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-gray-400">
              {AGENT_LABELS[s]}
            </span>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <p className="text-[10px] text-gray-500 mb-1">Version History</p>
        <div className="space-y-0.5">
          {memory.versionHistory.map((vh) => (
            <div key={vh.version} className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-500 font-mono">v{vh.version}</span>
              <span className="text-gray-400">{AGENT_LABELS[vh.updatedBy]}</span>
              <span className="text-gray-600 font-mono">{formatTimestamp(vh.updatedAt)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 mb-1">Content</p>
        <pre className="max-h-32 overflow-auto rounded-lg bg-zinc-950 p-3 text-[10px] text-gray-300 font-mono leading-relaxed">
          {prettyJSON(memory.content)}
        </pre>
      </div>
    </div>
  );
}

function LLMInspector({ call, onClose }: { call: LLMCall; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" style={{ animation: "df-fade-in 0.25s ease-out" }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-100">LLM Routing Inspector</span>
          {call.fallback && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400">
              FALLBACK
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-[10px] text-gray-500 hover:text-gray-300">Close</button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[11px] mb-3">
        <div>
          <p className="text-gray-500 mb-0.5">Agent</p>
          <p className="text-gray-200 font-medium">{AGENT_LABELS[call.agent]}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Strategy</p>
          <p className="text-gray-200 font-mono">{call.strategy}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Routing Decision</p>
          <div className="flex items-center gap-1">
            {call.fallback && (
              <>
                <span className="text-red-400 line-through text-[10px]">{call.attempted}</span>
                <span className="text-gray-500">-&gt;</span>
              </>
            )}
            <span className={`font-semibold ${call.used === "ollama" ? "text-emerald-400" : "text-violet-400"}`}>
              {call.used}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 text-[11px]">
        <div>
          <p className="text-gray-500 mb-0.5">Input Tokens</p>
          <p className="text-gray-200 font-mono">{call.inputTokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Output Tokens</p>
          <p className="text-gray-200 font-mono">{call.outputTokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Latency</p>
          <p className="text-gray-200 font-mono">{call.latencyMs}ms</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Cost</p>
          <p className="text-gray-200 font-mono">${call.costEstimate.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function DataFlowDiagram({ autoPlay = false }: DataFlowDiagramProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<A2AMessage | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<LLMCall | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  // Playback timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying && currentStep < TIMELINE_STEPS.length) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= TIMELINE_STEPS.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, currentStep]);

  // Stop when done
  useEffect(() => {
    if (currentStep > TIMELINE_STEPS.length) {
      setIsPlaying(false);
      setCurrentStep(TIMELINE_STEPS.length);
    }
  }, [currentStep]);

  const handlePlay = useCallback(() => {
    if (currentStep >= TIMELINE_STEPS.length) setCurrentStep(0);
    setIsPlaying(true);
  }, [currentStep]);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(prev + 1, TIMELINE_STEPS.length));
  }, []);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSelectedMessage(null);
    setSelectedMemory(null);
    setSelectedLLM(null);
  }, []);

  // Determine which elements are active at current step
  const activeAgents = useMemo<Set<AgentId>>(() => {
    const s = new Set<AgentId>();
    if (currentStep === 0) return s;
    const step = TIMELINE_STEPS[Math.min(currentStep, TIMELINE_STEPS.length) - 1];
    if (!step) return s;

    if (step.kind === "trigger" || step.kind === "report") {
      s.add("orchestrator");
    } else if (step.kind === "a2a" && step.a2aMessageId) {
      const msg = MOCK_A2A_MESSAGES.find((m) => m.id === step.a2aMessageId);
      if (msg) { s.add(msg.from); s.add(msg.to); }
    } else if (step.kind === "memory" && step.memoryOpId) {
      const op = MOCK_MEMORY_OPS.find((o) => o.id === step.memoryOpId);
      if (op) s.add(op.agent);
    } else if (step.kind === "llm" && step.llmCallId) {
      const call = MOCK_LLM_CALLS.find((c) => c.id === step.llmCallId);
      if (call) s.add(call.agent);
    }
    return s;
  }, [currentStep]);

  // Active A2A arrow for current step
  const activeA2A = useMemo(() => {
    if (currentStep === 0) return null;
    const step = TIMELINE_STEPS[Math.min(currentStep, TIMELINE_STEPS.length) - 1];
    if (step?.kind === "a2a" && step.a2aMessageId) {
      return MOCK_A2A_MESSAGES.find((m) => m.id === step.a2aMessageId) ?? null;
    }
    return null;
  }, [currentStep]);

  // Active memory op for current step
  const activeMemOp = useMemo(() => {
    if (currentStep === 0) return null;
    const step = TIMELINE_STEPS[Math.min(currentStep, TIMELINE_STEPS.length) - 1];
    if (step?.kind === "memory" && step.memoryOpId) {
      return MOCK_MEMORY_OPS.find((o) => o.id === step.memoryOpId) ?? null;
    }
    return null;
  }, [currentStep]);

  // Active LLM call for current step
  const activeLLM = useMemo(() => {
    if (currentStep === 0) return null;
    const step = TIMELINE_STEPS[Math.min(currentStep, TIMELINE_STEPS.length) - 1];
    if (step?.kind === "llm" && step.llmCallId) {
      return MOCK_LLM_CALLS.find((c) => c.id === step.llmCallId) ?? null;
    }
    return null;
  }, [currentStep]);

  // Completed steps (everything before currentStep)
  const completedStepIds = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 1; i < currentStep; i++) ids.add(i);
    return ids;
  }, [currentStep]);

  // Helper: which A2A messages have been completed or are active
  const visibleA2AIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < currentStep; i++) {
      const st = TIMELINE_STEPS[i];
      if (st?.a2aMessageId) ids.add(st.a2aMessageId);
    }
    return ids;
  }, [currentStep]);

  // Helper: which memory ops have been completed or are active
  const visibleMemOpIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < currentStep; i++) {
      const st = TIMELINE_STEPS[i];
      if (st?.memoryOpId) ids.add(st.memoryOpId);
    }
    return ids;
  }, [currentStep]);

  // SVG coordinate helpers for A2A arrows
  function getA2AArrowCoords(msg: A2AMessage) {
    const fromX = AGENT_CX[msg.from];
    const toX = AGENT_CX[msg.to];
    // Stagger vertically based on message index
    const idx = MOCK_A2A_MESSAGES.indexOf(msg);
    const baseY = LANE_Y + LANE_HDR_H + 30 + idx * 44;
    return { x1: fromX, y1: baseY, x2: toX, y2: baseY };
  }

  // Memory pool Y coords
  const memPoolCenterY = MEM_Y + MEM_H / 2;

  // Service Y coords
  const svcCenterY = SVC_Y + SVC_H / 2;

  // Service X positions
  const pgX = SVG_W * 0.14;
  const redisX = SVG_W * 0.38;
  const ollamaX = SVG_W * 0.62;
  const claudeX = SVG_W * 0.86;

  const closeInspectors = useCallback(() => {
    setSelectedMessage(null);
    setSelectedMemory(null);
    setSelectedLLM(null);
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">Agent Communication & Data Flow</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Interactive timeline of agent interactions, memory operations, and LLM routing
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: COLORS.delegate, borderTop: "2px dashed " + COLORS.delegate }} /> Delegate
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: COLORS.result }} /> Result
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: COLORS.memoryWrite }} /> Mem Write
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: COLORS.memoryRead }} /> Mem Read
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: COLORS.llm }} /> LLM
          </span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:bg-zinc-700 hover:text-gray-200 transition-colors"
            title="Reset"
          >
            Reset
          </button>
          <button
            onClick={handleStepBack}
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:bg-zinc-700 hover:text-gray-200 transition-colors"
            disabled={currentStep <= 0}
            title="Step Back"
          >
            Step Back
          </button>
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="rounded-md bg-pink-500/20 px-3 py-1 text-[11px] font-bold text-pink-400 hover:bg-pink-500/30 transition-colors"
              title="Pause"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="rounded-md bg-pink-500/20 px-3 py-1 text-[11px] font-bold text-pink-400 hover:bg-pink-500/30 transition-colors"
              title="Play"
            >
              Play
            </button>
          )}
          <button
            onClick={handleStepForward}
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-gray-400 hover:bg-zinc-700 hover:text-gray-200 transition-colors"
            disabled={currentStep >= TIMELINE_STEPS.length}
            title="Step Forward"
          >
            Step Forward
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500">
            Step {Math.min(currentStep, TIMELINE_STEPS.length)} / {TIMELINE_STEPS.length}
          </span>
          {currentStep > 0 && currentStep <= TIMELINE_STEPS.length && (
            <span className="text-[11px] text-gray-300 font-medium">
              {TIMELINE_STEPS[currentStep - 1].label}
            </span>
          )}
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 mr-1">Speed:</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                speed === s
                  ? "bg-pink-500/20 text-pink-400"
                  : "bg-zinc-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline mini bar */}
      <div className="mb-4 flex gap-0.5">
        {TIMELINE_STEPS.map((step) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = completedStepIds.has(step.id);
          const isPending = step.id > currentStep;
          const kindColors: Record<StepKind, string> = {
            trigger: "bg-pink-500",
            a2a: step.a2aMessageId
              ? MOCK_A2A_MESSAGES.find((m) => m.id === step.a2aMessageId)?.type === "delegate"
                ? "bg-pink-500"
                : "bg-emerald-500"
              : "bg-pink-500",
            memory: step.memoryOpId
              ? MOCK_MEMORY_OPS.find((o) => o.id === step.memoryOpId)?.operation === "WRITE"
                ? "bg-fuchsia-500"
                : "bg-blue-500"
              : "bg-fuchsia-500",
            llm: "bg-violet-500",
            report: "bg-emerald-500",
          };

          return (
            <button
              key={step.id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStep(step.id);
              }}
              className={`group relative h-2 flex-1 rounded-full transition-all duration-300 ${
                isCurrent
                  ? kindColors[step.kind]
                  : isCompleted
                    ? kindColors[step.kind] + " opacity-40"
                    : "bg-zinc-800"
              }`}
              title={`${step.id}. ${step.label}`}
              style={isCurrent ? { animation: "df-pulse 1.5s ease-in-out infinite", boxShadow: "0 0 8px rgba(236,72,153,0.4)" } : undefined}
            >
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* SVG Diagram */}
      <div className="flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ maxWidth: SVG_W, minWidth: 600 }}
          className="select-none"
        >
          {/* Background separators */}
          <rect x={0} y={LANE_Y} width={SVG_W} height={LANE_H} rx={8} fill="#18181b" stroke="#27272a" strokeWidth={1} />
          <line x1={LANE_W} y1={LANE_Y + LANE_HDR_H} x2={LANE_W} y2={LANE_Y + LANE_H} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={LANE_W * 2} y1={LANE_Y + LANE_HDR_H} x2={LANE_W * 2} y2={LANE_Y + LANE_H} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />

          {/* Memory pool bg */}
          <rect x={20} y={MEM_Y} width={SVG_W - 40} height={MEM_H} rx={8} fill="#18181b" stroke="#27272a" strokeWidth={1} />
          <text x={40} y={MEM_Y + 16} fontSize="10" fontWeight="700" fill="#71717a">SHARED MEMORY POOL</text>

          {/* Swim lane headers */}
          <SwimLaneHeader x={0} label={AGENT_LABELS.orchestrator} active={activeAgents.has("orchestrator")} />
          <SwimLaneHeader x={LANE_W} label={AGENT_LABELS.deep_analysis} active={activeAgents.has("deep_analysis")} />
          <SwimLaneHeader x={LANE_W * 2} label={AGENT_LABELS.fix_suggestion} active={activeAgents.has("fix_suggestion")} />

          {/* --- A2A message arrows --- */}
          {MOCK_A2A_MESSAGES.map((msg) => {
            const isActive = activeA2A?.id === msg.id;
            const isVisible = visibleA2AIds.has(msg.id);
            const isDimmed = !isVisible && !isActive;
            const coords = getA2AArrowCoords(msg);
            const color = msg.type === "delegate" ? COLORS.delegate : msg.type === "result" ? COLORS.result : COLORS.error;

            return (
              <AnimatedArrow
                key={msg.id}
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                color={color}
                dashed={msg.type === "delegate"}
                active={isActive}
                dimmed={isDimmed}
                label={msg.type}
                onClick={() => {
                  closeInspectors();
                  setSelectedMessage(msg);
                }}
              />
            );
          })}

          {/* --- Memory operation arrows --- */}
          {MOCK_MEMORY_OPS.map((op) => {
            const isActive = activeMemOp?.id === op.id;
            const isVisible = visibleMemOpIds.has(op.id);
            const isDimmed = !isVisible && !isActive;
            const agentX = AGENT_CX[op.agent];
            const mem = MOCK_MEMORIES.find((m) => m.id === op.memoryId);
            const memIdx = MOCK_MEMORIES.findIndex((m) => m.id === op.memoryId);
            const memX = 60 + memIdx * (SVG_W - 120) / Math.max(MOCK_MEMORIES.length - 1, 1);

            if (op.operation === "WRITE") {
              // Arrow from agent lane down to memory pool
              return (
                <AnimatedArrow
                  key={op.id}
                  x1={agentX}
                  y1={LANE_Y + LANE_H}
                  x2={memX}
                  y2={MEM_Y + 24}
                  color={COLORS.memoryWrite}
                  active={isActive}
                  dimmed={isDimmed}
                  label="WRITE"
                  curved
                  onClick={() => {
                    if (mem) { closeInspectors(); setSelectedMemory(mem); }
                  }}
                />
              );
            } else {
              // Arrow from memory pool up to agent lane
              return (
                <AnimatedArrow
                  key={op.id}
                  x1={memX}
                  y1={MEM_Y + 24}
                  x2={agentX}
                  y2={LANE_Y + LANE_H}
                  color={COLORS.memoryRead}
                  active={isActive}
                  dimmed={isDimmed}
                  label="READ"
                  curved
                  onClick={() => {
                    if (mem) { closeInspectors(); setSelectedMemory(mem); }
                  }}
                />
              );
            }
          })}

          {/* --- LLM call arrows --- */}
          {MOCK_LLM_CALLS.map((call, idx) => {
            const isActive = activeLLM?.id === call.id;
            const llmStepIdx = TIMELINE_STEPS.findIndex((s) => s.llmCallId === call.id);
            const isVisible = llmStepIdx >= 0 && llmStepIdx < currentStep;
            const isDimmed = !isVisible && !isActive;
            const agentX = AGENT_CX[call.agent];
            const targetX = call.used === "ollama" ? ollamaX : claudeX;

            return (
              <g key={call.id}>
                <AnimatedArrow
                  x1={agentX + (idx - 1) * 15}
                  y1={LANE_Y + LANE_H}
                  x2={targetX}
                  y2={SVC_Y}
                  color={COLORS.llm}
                  active={isActive}
                  dimmed={isDimmed}
                  label={call.fallback ? "fallback" : "LLM"}
                  curved
                  onClick={() => {
                    closeInspectors();
                    setSelectedLLM(call);
                  }}
                />
                {/* If fallback, show crossed-out arrow to ollama */}
                {call.fallback && isActive && (
                  <g opacity={0.3}>
                    <line
                      x1={agentX + (idx - 1) * 15}
                      y1={LANE_Y + LANE_H + 10}
                      x2={ollamaX}
                      y2={SVC_Y}
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    {/* X mark */}
                    <text
                      x={(agentX + (idx - 1) * 15 + ollamaX) / 2}
                      y={(LANE_Y + LANE_H + 10 + SVC_Y) / 2}
                      textAnchor="middle"
                      fill="#EF4444"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      X
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* --- Memory tags --- */}
          {MOCK_MEMORIES.map((mem, idx) => {
            const memX = 60 + idx * (SVG_W - 120) / Math.max(MOCK_MEMORIES.length - 1, 1);
            const tagW = 130;
            const tagH = 70;
            const typeStyle = MEMORY_TYPE_COLORS[mem.memoryType];
            const vis = VISIBILITY_ICONS[mem.visibility];
            const isWrittenTo = activeMemOp?.memoryId === mem.id && activeMemOp.operation === "WRITE";
            const isReadFrom = activeMemOp?.memoryId === mem.id && activeMemOp.operation === "READ";
            const glowStyle = isWrittenTo
              ? "border-fuchsia-500/60 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
              : isReadFrom
                ? "border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                : "border-zinc-700/40";

            return (
              <foreignObject
                key={mem.id}
                x={memX - tagW / 2}
                y={MEM_Y + 28}
                width={tagW}
                height={tagH}
              >
                <div
                  className={`h-full cursor-pointer rounded-lg border bg-zinc-900/80 px-2 py-1.5 transition-all duration-300 ${glowStyle}`}
                  onClick={() => {
                    closeInspectors();
                    setSelectedMemory(mem);
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`rounded px-1 py-px text-[8px] font-semibold ${typeStyle?.bg ?? "bg-zinc-700/30"} ${typeStyle?.text ?? "text-gray-400"}`}>
                      {mem.memoryType}
                    </span>
                    <span className="text-[8px] text-gray-600">{vis.icon}</span>
                  </div>
                  <p className="text-[8px] text-gray-400 truncate mb-0.5">{mem.key}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-gray-600 font-mono">v{mem.version}</span>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-8 rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-pink-500" style={{ width: `${mem.confidence * 100}%` }} />
                      </div>
                      <span className="text-[7px] text-gray-600">{(mem.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {mem.ttlSeconds && (
                    <div className="mt-0.5 text-[7px] text-amber-500/70 font-mono">
                      TTL: {mem.ttlSeconds}s
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}

          {/* --- External services --- */}
          <ServiceBox x={pgX} y={SVC_Y} label="PostgreSQL" sublabel="memories, findings" color="#10B981" />
          <ServiceBox x={redisX} y={SVC_Y} label="Redis" sublabel="streams, cache" color="#F59E0B" />
          <ServiceBox x={ollamaX} y={SVC_Y} label="Ollama" sublabel="local LLM" color="#10B981" />
          <ServiceBox x={claudeX} y={SVC_Y} label="Claude API" sublabel="fallback LLM" color="#8B5CF6" />

          {/* Section labels */}
          <text x={SVG_W / 2} y={LANE_Y + LANE_H + 12} textAnchor="middle" fontSize="9" fill="#52525b" fontWeight="500">
            AGENT SWIM LANES
          </text>
          <text x={SVG_W / 2} y={SVC_Y - 6} textAnchor="middle" fontSize="9" fill="#52525b" fontWeight="500">
            DATA STORES & EXTERNAL SERVICES
          </text>

          {/* Active step pulse indicator in agent lane */}
          {currentStep > 0 && currentStep <= TIMELINE_STEPS.length && (
            (() => {
              const step = TIMELINE_STEPS[currentStep - 1];
              let pulseAgent: AgentId | null = null;

              if (step.kind === "trigger" || step.kind === "report") pulseAgent = "orchestrator";
              else if (step.kind === "a2a" && step.a2aMessageId) {
                const msg = MOCK_A2A_MESSAGES.find((m) => m.id === step.a2aMessageId);
                pulseAgent = msg?.from ?? null;
              } else if (step.kind === "memory" && step.memoryOpId) {
                const op = MOCK_MEMORY_OPS.find((o) => o.id === step.memoryOpId);
                pulseAgent = op?.agent ?? null;
              } else if (step.kind === "llm" && step.llmCallId) {
                const call = MOCK_LLM_CALLS.find((c) => c.id === step.llmCallId);
                pulseAgent = call?.agent ?? null;
              }

              if (!pulseAgent) return null;
              const cx = AGENT_CX[pulseAgent];
              const cy = LANE_Y + LANE_HDR_H + 18;

              return (
                <g>
                  <circle cx={cx} cy={cy} r="6" fill="#EC4899" opacity={0.8} style={{ animation: "df-pulse 1s ease-in-out infinite" }} />
                  <circle cx={cx} cy={cy} r="6" fill="none" stroke="#EC4899" strokeWidth="2" opacity={0.4} style={{ animation: "df-pulse-ring 1.5s ease-out infinite" }} />
                  <text x={cx} y={cy + 18} textAnchor="middle" fill="#EC4899" fontSize="8" fontWeight="600" opacity={0.9}>
                    {step.label}
                  </text>
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* Step description */}
      {currentStep > 0 && currentStep <= TIMELINE_STEPS.length && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <span className="rounded bg-pink-500/15 px-2 py-0.5 text-pink-400 font-semibold text-[10px]">
            Step {currentStep}
          </span>
          <span className="text-gray-300">{TIMELINE_STEPS[currentStep - 1].description}</span>
        </div>
      )}

      {/* Inspector panels */}
      {selectedMessage && (
        <div className="mt-4">
          <MessageInspector message={selectedMessage} onClose={() => setSelectedMessage(null)} />
        </div>
      )}
      {selectedMemory && (
        <div className="mt-4">
          <MemoryInspector memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        </div>
      )}
      {selectedLLM && (
        <div className="mt-4">
          <LLMInspector call={selectedLLM} onClose={() => setSelectedLLM(null)} />
        </div>
      )}
    </div>
  );
}
