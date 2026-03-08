import { useQuery } from "@tanstack/react-query";
import { mockMemories } from "../mocks/memories";
import type { Memory } from "../types/agent";

export function useMemories() {
  return useQuery<Memory[]>({
    queryKey: ["memories"],
    queryFn: async () => mockMemories,
  });
}
