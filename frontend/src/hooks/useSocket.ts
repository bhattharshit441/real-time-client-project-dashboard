import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";

// One socket connection per authenticated session, authenticated via the
// same JWT access token used for REST calls.
export function useSocket(): Socket | null {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const s = io(API_URL, { auth: { token } });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  return socket;
}
