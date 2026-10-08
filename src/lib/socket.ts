/**
 * Socket.IO client — connects to the Flask-SocketIO backend and exposes a
 * tiny hook so components can refetch when the server broadcasts a change.
 *
 * The backend emits a single "data_changed" event:
 *   { resource: "transactions" | "products" | "pricing" | "tutorials" | "visibility",
 *     action: "create" | "update" | "delete" | ... }
 */
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

export type DataChange = {
  resource: string;
  action: string;
  [key: string]: unknown;
};

// Single shared connection for the whole app.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return socket;
}

/**
 * Run `onChange` whenever the server broadcasts a change for one of the
 * given resources (or every change if `resources` is omitted).
 */
export function useRealtime(
  resources: string | string[] | undefined,
  onChange: (change: DataChange) => void
) {
  useEffect(() => {
    const s = getSocket();
    const wanted = resources === undefined
      ? null
      : Array.isArray(resources) ? resources : [resources];

    const handler = (change: DataChange) => {
      if (!wanted || wanted.includes(change.resource)) {
        onChange(change);
      }
    };

    s.on("data_changed", handler);
    return () => {
      s.off("data_changed", handler);
    };
    // onChange is expected to be stable (useCallback) at call sites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(resources) ? resources.join(",") : resources]);
}
