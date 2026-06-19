import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("tl_token") : null;
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001", {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
