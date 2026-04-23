import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const nextSocket = io();
    setSocket(nextSocket);
    return () => nextSocket.close();
  }, []);

  return socket;
}

