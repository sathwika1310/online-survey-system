import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    // Join dashboard room by default
    socketRef.current.emit('join-dashboard');

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  const joinSurveyRoom = (surveyId) => {
    socketRef.current?.emit('join-survey-room', surveyId);
  };

  const on = (event, callback) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  };

  const off = (event, callback) => {
    socketRef.current?.off(event, callback);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinSurveyRoom, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};
