import { useQuery } from "@tanstack/react-query";
import { mockMessages } from "../mocks/messages";
import type { A2AMessage } from "../types/agent";

export function useA2AMessages() {
  return useQuery<A2AMessage[]>({
    queryKey: ["a2a-messages"],
    queryFn: async () => mockMessages,
  });
}
