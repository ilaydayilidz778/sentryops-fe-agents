import type { A2AMessage } from "../types/agent";

const typeBadge: Record<A2AMessage["type"], string> = {
  task_delegation: "bg-pink-500/15 text-pink-400",
  result_report: "bg-green-500/15 text-green-400",
  status_update: "bg-blue-500/15 text-blue-400",
  error_report: "bg-red-500/15 text-red-400",
};

interface Props {
  messages: A2AMessage[];
}

export default function A2AMessageLog({ messages }: Props) {
  if (messages.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No messages recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-200">{msg.fromAgentName}</span>
            <span className="text-gray-600">&rarr;</span>
            <span className="text-sm font-medium text-gray-200">{msg.toAgentName}</span>
            <span className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${typeBadge[msg.type]}`}>
              {msg.type.replace(/_/g, " ")}
            </span>
          </div>

          <pre className="mb-2 max-h-32 overflow-auto rounded bg-gray-950 p-2 text-xs text-gray-400">
            {JSON.stringify(msg.payload, null, 2)}
          </pre>

          <p className="text-right text-xs text-gray-600">
            {new Date(msg.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
