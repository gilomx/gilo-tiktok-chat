let ioRef = null;

export function registerSocket(io) {
  ioRef = io;
}

export function emitAppEvent(event, payload) {
  if (ioRef) {
    ioRef.emit(event, payload);
  }
}

