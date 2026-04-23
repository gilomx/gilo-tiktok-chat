import { useEffect, useRef } from "react";
import { http } from "../api/http";

export default function QueuePlayer({ enabled, onRefresh }) {
  const onRefreshRef = useRef(onRefresh);
  const enabledRef = useRef(enabled);
  const timeoutRef = useRef(null);
  const audioRef = useRef(null);
  const runningRef = useRef(false);
  const generationRef = useRef(0);

  const clearPendingTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    enabledRef.current = enabled;
    generationRef.current += 1;
    const currentGeneration = generationRef.current;

    clearPendingTimeout();

    if (!enabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      runningRef.current = false;
      return undefined;
    }

    const runLoop = async () => {
      if (runningRef.current || !enabledRef.current || generationRef.current !== currentGeneration) {
        return;
      }

      runningRef.current = true;
      let activeMessageId = null;

      try {
        const next = await http("/api/queue/claim-next", { method: "POST" });

        if (!next) {
          return;
        }

        activeMessageId = next._id;
        onRefreshRef.current?.();
        const audio = new Audio(`/api/tts/message/${next._id}`);
        audioRef.current = audio;

        await new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = reject;
          audio.play().catch(reject);
        });

        if (generationRef.current === currentGeneration) {
          await http(`/api/queue/${next._id}/complete`, { method: "POST" });
          onRefreshRef.current?.();
        }
      } catch (error) {
        console.error(error);
        if (activeMessageId) {
          try {
            await http("/api/queue/pause", { method: "POST" });
            onRefreshRef.current?.();
          } catch (pauseError) {
            console.error(pauseError);
          }
        }
      } finally {
        audioRef.current = null;
        runningRef.current = false;

        if (enabledRef.current && generationRef.current === currentGeneration) {
          timeoutRef.current = window.setTimeout(runLoop, 1000);
        }
      }
    };

    runLoop();

    return () => {
      clearPendingTimeout();
      generationRef.current += 1;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      runningRef.current = false;
    };
  }, [enabled]);

  return null;
}
