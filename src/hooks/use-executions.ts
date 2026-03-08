import { useQuery } from "@tanstack/react-query";
import { mockExecutions } from "../mocks/executions";
import type { Execution } from "../types/agent";

export function useExecutions() {
  return useQuery<Execution[]>({
    queryKey: ["executions"],
    queryFn: async () => mockExecutions,
  });
}
