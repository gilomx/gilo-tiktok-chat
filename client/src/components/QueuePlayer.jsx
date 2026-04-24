import { useEffect, useRef } from "react";
import { http } from "../api/http";

function applyRealtimeVolume(audio, gainNode, volumePercent) {
  const normalizedPercent = Math.max(0, Number(volumePercent) || 0);
  const normalizedGain = Math.min(2, normalizedPercent / 100);

  if (gainNode) {
    gainNode.gain.value = normalizedGain;
    return;
  }

  audio.volume = Math.min(1, normalizedGain);
}

export default function QueuePlayer({ enabled, onRefresh, volumePercent = 100 }) {
  const onRefreshRef = useRef(onRefresh);
  const enabledRef = useRef(enabled);
  const timeoutRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const runningRef = useRef(false);
  const generationRef = useRef(0);

  const cleanupAudioNodes = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  };

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
    if (!audioRef.current) {
      return;
    }

    applyRealtimeVolume(audioRef.current, gainNodeRef.current, volumePercent);
  }, [volumePercent]);

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
      cleanupAudioNodes();
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

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
          }

          cleanupAudioNodes();
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
          gainNodeRef.current = audioContextRef.current.createGain();
          sourceNodeRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
          applyRealtimeVolume(audio, gainNodeRef.current, volumePercent);
        } else {
          applyRealtimeVolume(audio, null, volumePercent);
        }

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
        cleanupAudioNodes();
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
      cleanupAudioNodes();
      runningRef.current = false;
    };
  }, [enabled]);

  return null;
}
