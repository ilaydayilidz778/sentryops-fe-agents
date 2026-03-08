import { useQuery } from "@tanstack/react-query";
import { mockExecutions } from "../mocks/executions";
import type { Execution } from "../types/agent";

export function useDelegationChain(executionId: string | null) {
  return useQuery<Execution[]>({
    queryKey: ["executions", executionId, "chain"],
    queryFn: async () => {
      if (!executionId) return [];
      const chain: Execution[] = [];
      let currentId: string | null = executionId;

      // Walk up to root
      while (currentId) {
        const exec = mockExecutions.find((e) => e.id === currentId);
        if (!exec) break;
        chain.unshift(exec);
        currentId = exec.parentExecutionId;
      }

      // Walk down from original execution
      const root = mockExecutions.find((e) => e.id === executionId);
      if (root) {
        const addChildren = (parentId: string) => {
          for (const exec of mockExecutions) {
            if (exec.parentExecutionId === parentId && !chain.some((c) => c.id === exec.id)) {
              chain.push(exec);
              addChildren(exec.id);
            }
          }
        };
        addChildren(executionId);
      }

      return chain;
    },
    enabled: !!executionId,
  });
}
