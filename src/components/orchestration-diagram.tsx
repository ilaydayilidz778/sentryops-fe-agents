import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AgentType = "orchestrator" | "deep_analysis" | "fix_suggestion";
type AgentStatus = "active" | "idle" | "error";

interface AgentNode {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  messageCount: number;
}

interface OrchestrationDiagramProps {
  agents?: AgentNode[];
  onAgentClick?: (agentId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  CSS keyframes                                                      */
/* ------------------------------------------------------------------ */

const STYLE_ID = "orchestration-diagram-keyframes";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes od-dash {
      to { stroke-dashoffset: -20; }
    }
    @keyframes od-dash-up {
      to { stroke-dashoffset: 20; }
    }
    @keyframes od-glow {
      0%, 100% { filter: drop-shadow(0 0 6px rgba(236,72,153,0.4)); }
      50%      { filter: drop-shadow(0 0 16px rgba(236,72,153,0.7)); }
    }
    @keyframes od-pulse-ring {
      0%   { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    @keyframes od-fade-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_AGENTS: AgentNode[] = [
  {
    id: "orch-001",
    name: "Security Orchestrator",
    type: "orchestrator",
    status: "active",
    currentTask: "Delegating scan analysis for PR #142",
    messageCount: 24,
  },
  {
    id: "deep-001",
    name: "Deep Analysis Agent",
    type: "deep_analysis",
    status: "active",
    currentTask: "Analyzing SQL injection finding in auth.py",
    messageCount: 12,
  },
  {
    id: "fix-001",
    name: "Fix Suggestion Agent",
    type: "fix_suggestion",
    status: "idle",
    currentTask: null,
    messageCount: 8,
  },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<AgentType, { border: string; bg: string; text: string; badge: string }> = {
  orchestrator: {
    border: "border-pink-500",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    badge: "bg-pink-500/15 text-pink-400",
  },
  deep_analysis: {
    border: "border-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    badge: "bg-fuchsia-500/15 text-fuchsia-400",
  },
  fix_suggestion: {
    border: "border-violet-500",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    badge: "bg-violet-500/15 text-violet-400",
  },
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: "bg-emerald-400",
  idle: "bg-yellow-400",
  error: "bg-red-400",
};

/* ------------------------------------------------------------------ */
/*  SVG layout constants                                               */
/* ------------------------------------------------------------------ */

const SVG_W = 740;
const SVG_H = 540;

const ORCH_X = SVG_W / 2;
const ORCH_Y = 60;

const DEEP_X = SVG_W / 2 - 160;
const DEEP_Y = 210;

const FIX_X = SVG_W / 2 + 160;
const FIX_Y = 210;

const MEM_X = SVG_W / 2 - 200;
const MEM_Y = 420;
const A2A_X = SVG_W / 2;
const A2A_Y = 420;
const LLM_X = SVG_W / 2 + 200;
const LLM_Y = 420;

const CARD_W = 190;
const CARD_H = 100;
const POOL_W = 140;
const POOL_H = 70;

/* ------------------------------------------------------------------ */
/*  Connection line component                                          */
/* ------------------------------------------------------------------ */

interface ConnectionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label?: string;
  reverse?: boolean;
  active?: boolean;
}

function Connection({ x1, y1, x2, y2, color, label, reverse, active = true }: ConnectionProps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const path = `M${x1},${y1} Q${mx},${y1} ${mx},${my} Q${mx},${y2} ${x2},${y2}`;

  return (
    <g>
      {/* Background line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1" opacity={0.15} />
      {/* Animated dashed line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="6 6"
        style={
          active
            ? { animation: `${reverse ? "od-dash-up" : "od-dash"} 1s linear infinite` }
            : undefined
        }
        opacity={active ? 0.8 : 0.3}
      />
      {/* Moving dot */}
      {active && (
        <circle r="3" fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {/* Label */}
      {label && (
        <text x={mx} y={my - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="500">
          {label}
        </text>
      )}
      {/* Arrowhead */}
      <circle cx={x2} cy={y2} r="4" fill={color} opacity={0.6} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent card (SVG foreignObject)                                     */
/* ------------------------------------------------------------------ */

interface AgentCardSVGProps {
  agent: AgentNode;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
}

function AgentCardSVG({ agent, x, y, selected, onClick }: AgentCardSVGProps) {
  const colors = TYPE_COLORS[agent.type];
  const statusColor = STATUS_COLORS[agent.status];
  const isActive = agent.status === "active";

  return (
    <foreignObject x={x - CARD_W / 2} y={y - CARD_H / 2} width={CARD_W} height={CARD_H + 16}>
      <div
        onClick={onClick}
        className={`h-full cursor-pointer rounded-xl border ${
          selected ? colors.border + " ring-1 ring-pink-500/30" : "border-zinc-700"
        } bg-zinc-900 p-3 transition-all hover:border-pink-500/40`}
        style={isActive ? { animation: "od-glow 3s ease-in-out infinite" } : undefined}
      >
        {/* Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-100 truncate max-w-[120px]">
            {agent.name}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${statusColor} ${isActive ? "animate-pulse" : ""}`}
            />
          </div>
        </div>

        {/* Type badge */}
        <div className="mb-1.5">
          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${colors.badge}`}>
            {agent.type.replace("_", " ")}
          </span>
        </div>

        {/* Task or idle */}
        <p className="text-[10px] text-gray-400 truncate">
          {agent.currentTask ?? "Waiting for delegation..."}
        </p>

        {/* Message counter badge */}
        {agent.messageCount > 0 && (
          <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-bold text-white">
            {agent.messageCount}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom pool node                                                   */
/* ------------------------------------------------------------------ */

interface PoolNodeProps {
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
}

function PoolNode({ label, sublabel, x, y, color }: PoolNodeProps) {
  return (
    <foreignObject x={x - POOL_W / 2} y={y - POOL_H / 2} width={POOL_W} height={POOL_H}>
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2">
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
        <span className="mt-1 text-[10px] text-gray-500">{sublabel}</span>
      </div>
    </foreignObject>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  agent: AgentNode | null;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function OrchestrationDiagram({
  agents,
  onAgentClick,
}: OrchestrationDiagramProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const agentList = agents ?? DEFAULT_AGENTS;

  useEffect(() => {
    ensureStyles();
  }, []);

  const orch = agentList.find((a) => a.type === "orchestrator") ?? DEFAULT_AGENTS[0];
  const deep = agentList.find((a) => a.type === "deep_analysis") ?? DEFAULT_AGENTS[1];
  const fix = agentList.find((a) => a.type === "fix_suggestion") ?? DEFAULT_AGENTS[2];

  const handleClick = useCallback(
    (id: string) => {
      setSelectedAgent((prev) => (prev === id ? null : id));
      onAgentClick?.(id);
    },
    [onAgentClick],
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">Agent Orchestration</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Real-time agent delegation and communication flow
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-400" /> Idle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Error
          </span>
        </div>
      </div>

      {/* SVG Diagram */}
      <div className="flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ maxWidth: SVG_W, minWidth: 500 }}
          className="select-none"
        >
          {/* ---- Connections ---- */}

          {/* Orchestrator -> Deep Analysis (delegate) */}
          <Connection
            x1={ORCH_X - 40}
            y1={ORCH_Y + CARD_H / 2}
            x2={DEEP_X}
            y2={DEEP_Y - CARD_H / 2}
            color="#EC4899"
            label="delegate"
            active={deep.status === "active"}
          />

          {/* Orchestrator -> Fix Suggestion (delegate) */}
          <Connection
            x1={ORCH_X + 40}
            y1={ORCH_Y + CARD_H / 2}
            x2={FIX_X}
            y2={FIX_Y - CARD_H / 2}
            color="#EC4899"
            label="delegate"
            active={fix.status === "active"}
          />

          {/* Deep Analysis -> Shared Memory (result) */}
          <Connection
            x1={DEEP_X - 30}
            y1={DEEP_Y + CARD_H / 2 + 8}
            x2={MEM_X}
            y2={MEM_Y - POOL_H / 2}
            color="#10B981"
            label="result"
            active={deep.status === "active"}
          />

          {/* Deep Analysis -> A2A Messages (result) */}
          <Connection
            x1={DEEP_X + 30}
            y1={DEEP_Y + CARD_H / 2 + 8}
            x2={A2A_X - 20}
            y2={A2A_Y - POOL_H / 2}
            color="#10B981"
            label="result"
            active={deep.status === "active"}
          />

          {/* Fix Suggestion -> A2A Messages */}
          <Connection
            x1={FIX_X - 30}
            y1={FIX_Y + CARD_H / 2 + 8}
            x2={A2A_X + 20}
            y2={A2A_Y - POOL_H / 2}
            color="#10B981"
            label="result"
            active={fix.status === "active"}
          />

          {/* Fix Suggestion -> LLM Router */}
          <Connection
            x1={FIX_X + 30}
            y1={FIX_Y + CARD_H / 2 + 8}
            x2={LLM_X}
            y2={LLM_Y - POOL_H / 2}
            color="#A855F7"
            label="route"
            active={fix.status === "active"}
          />

          {/* Deep Analysis -> LLM Router */}
          <Connection
            x1={DEEP_X + 70}
            y1={DEEP_Y + CARD_H / 2 + 8}
            x2={LLM_X - 40}
            y2={LLM_Y - POOL_H / 2}
            color="#A855F7"
            label=""
            active={deep.status === "active"}
          />

          {/* ---- Agent nodes ---- */}
          <AgentCardSVG
            agent={orch}
            x={ORCH_X}
            y={ORCH_Y}
            selected={selectedAgent === orch.id}
            onClick={() => handleClick(orch.id)}
          />
          <AgentCardSVG
            agent={deep}
            x={DEEP_X}
            y={DEEP_Y}
            selected={selectedAgent === deep.id}
            onClick={() => handleClick(deep.id)}
          />
          <AgentCardSVG
            agent={fix}
            x={FIX_X}
            y={FIX_Y}
            selected={selectedAgent === fix.id}
            onClick={() => handleClick(fix.id)}
          />

          {/* ---- Bottom pool nodes ---- */}
          <PoolNode
            label="Shared Memory"
            sublabel="context, findings"
            x={MEM_X}
            y={MEM_Y}
            color="#10B981"
          />
          <PoolNode
            label="A2A Messages"
            sublabel="inter-agent comms"
            x={A2A_X}
            y={A2A_Y}
            color="#F59E0B"
          />
          <PoolNode
            label="LLM Router"
            sublabel="Ollama / Claude"
            x={LLM_X}
            y={LLM_Y}
            color="#A855F7"
          />
        </svg>
      </div>

      {/* Selected agent detail panel */}
      {selectedAgent && (
        <SelectedAgentPanel
          agent={agentList.find((a) => a.id === selectedAgent) ?? null}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Selected agent detail panel                                        */
/* ------------------------------------------------------------------ */

function SelectedAgentPanel({
  agent,
  onClose,
}: {
  agent: AgentNode | null;
  onClose: () => void;
}) {
  if (!agent) return null;
  const colors = TYPE_COLORS[agent.type];

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[agent.status]}`} />
          <h3 className="text-sm font-semibold text-gray-100">{agent.name}</h3>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.badge}`}>
            {agent.type.replace("_", " ")}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-gray-500 mb-1">Status</p>
          <p className="text-gray-200 capitalize">{agent.status}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Current Task</p>
          <p className="text-gray-200">{agent.currentTask ?? "None"}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Messages Processed</p>
          <p className="text-gray-200">{agent.messageCount}</p>
        </div>
      </div>

      {/* Mock execution list */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-2">Recent Executions</p>
        <div className="space-y-1">
          {[
            { id: "exec-1", status: "completed", time: "2m ago" },
            { id: "exec-2", status: "completed", time: "5m ago" },
            { id: "exec-3", status: "completed", time: "12m ago" },
          ].map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded bg-zinc-800 px-3 py-1.5"
            >
              <span className="text-[10px] font-mono text-gray-400">{e.id}</span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-500">{e.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
