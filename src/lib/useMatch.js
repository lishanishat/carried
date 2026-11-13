import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMatchState } from "@/lib/match-fns";

/**
 * Polls the match state so every device stays in sync (3s default).
 */
export default function useMatch(code, token, interval = 5000) {
  const fetchState = useServerFn(getMatchState);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!code || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetchState({ data: { code, token } });
      if (!mounted.current) return;
      if (res?.ok) {
        setState(res.state);
        setError("");
      } else {
        setError(res?.error || "Could not load the match.");
      }
    } catch (e) {
      if (mounted.current) setError(e?.message || "Could not reach the match server.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [code, token, fetchState]);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, interval);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [load, interval]);

  return { state, error, loading, refresh: load, setState };
}
