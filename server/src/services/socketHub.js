let ioRef = null;
const listeners = new Set();

export function registerSocket(io) {
  ioRef = io;
}

export function onAppEvent(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAppEvent(event, payload) {
  if (ioRef) {
    ioRef.emit(event, payload);
  }

  for (const listener of listeners) {
    try {
      listener(event, payload);
    } catch (error) {
      console.error("Error propagando evento interno", error);
    }
  }
}

