import { queryOptions } from "@tanstack/solid-query";
import { api } from "../client";
import { deserializeResult } from "../result";

export const systemStatusOptions = () =>
  queryOptions({
    queryKey: ["system", "status"],
    queryFn: async () => {
      const response = await api.api.system.status.get();

      if (response.error) {
        throw response.error;
      }

      return deserializeResult(response.data);
    },
  });
