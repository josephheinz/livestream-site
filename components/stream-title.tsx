"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// The editable stream title is bound to the live stream (else the next upcoming
// one, research D3) and persisted via streams.update. Editing is admin-only
// (`users.me.role === "admin"`); the change propagates to every Watch page
// through the reactive query (SC-003).
export function useStreamTitle(): {
  title: string;
  canEdit: boolean;
  save: (title: string) => void;
} {
  const me = useQuery(api.users.me);
  const live = useQuery(api.streams.getLive);
  const upcoming = useQuery(api.streams.listUpcoming);
  const update = useMutation(api.streams.update);

  const bound = live ?? upcoming?.[0] ?? null;
  const streamId = bound?._id;
  const canEdit = me?.role === "admin";

  const save = React.useCallback(
    (title: string) => {
      if (streamId !== undefined) {
        void update({ streamId, title });
      }
    },
    [streamId, update],
  );

  return { title: bound?.title ?? "", canEdit, save };
}
