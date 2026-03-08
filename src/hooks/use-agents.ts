import { useQuery } from "@tanstack/react-query";
import { mockAgents } from "../mocks/agents";
import type { Agent } from "../types/agent";

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => mockAgents,
  });
}
