"use client";

import { useEffect, useRef, useState } from "react";

type SSEHandler = (data: Record<string, unknown>) => void;

export function useSSE(onMessage: SSEHandler) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const es = new EventSource("/api/sse");

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlerRef.current(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected };
}
