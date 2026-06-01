import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStatusQuery(enabled = true) {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.status,
    enabled,
  });
}

export function useSourcesQuery(enabled = true) {
  return useQuery({
    queryKey: ["sources"],
    queryFn: api.sources,
    enabled,
  });
}

export function usePanelSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: ["panel-settings"],
    queryFn: api.panelSettings,
    enabled,
  });
}

export function usePanelRefresh() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["status"] }),
      queryClient.invalidateQueries({ queryKey: ["panel-settings"] }),
      queryClient.invalidateQueries({ queryKey: ["sources"] }),
    ]);
  };
}

export function useReloadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reload,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}

export function useBatchDelayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.delays,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useSingleDelayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.delay,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useSelectSlotMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slotId, name }: { slotId: number; name: string }) =>
      api.selectSlot(slotId, { name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useSaveSourcesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.saveSources,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}

export function useSavePanelSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.savePanelSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
}
