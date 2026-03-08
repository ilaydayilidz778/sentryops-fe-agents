import type { Memory } from "../types/agent";

interface Props {
  memory: Memory;
  onClose: () => void;
}

export default function MemoryDetail({ memory, onClose }: Props) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-100">{memory.key}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">&times;</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Agent</p>
          <p className="text-gray-300">{memory.agentName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Scope</p>
          <p className="text-gray-300">{memory.scope}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Updated</p>
          <p className="text-gray-300">{new Date(memory.updatedAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">TTL</p>
          <p className="text-gray-300">{memory.ttl ?? "Never expires"}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-gray-500">Content (JSON)</p>
        <pre className="max-h-80 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
          {JSON.stringify(memory.value, null, 2)}
        </pre>
      </div>
    </div>
  );
}
