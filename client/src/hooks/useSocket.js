import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === 'production' ? window.location.origin : 'http://localhost:3001');

let globalSocket = null;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!globalSocket) {
            globalSocket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
        }

        socketRef.current = globalSocket;

        const onConnect = () => {
            console.log('[Socket.io] Conectado al servidor en tiempo real');
            setIsConnected(true);
        };

        const onDisconnect = () => {
            console.log('[Socket.io] Desconectado del servidor');
            setIsConnected(false);
        };

        const onCdrUpdate = (data) => {
            console.log('[Socket.io] Evento recibido: cdrs_updated', data);
            setLastEvent({ type: 'cdrs_updated', data, timestamp: Date.now() });
        };

        if (globalSocket.connected) {
            setIsConnected(true);
        }

        globalSocket.on('connect', onConnect);
        globalSocket.on('disconnect', onDisconnect);
        globalSocket.on('cdrs_updated', onCdrUpdate);

        return () => {
            if (globalSocket) {
                globalSocket.off('connect', onConnect);
                globalSocket.off('disconnect', onDisconnect);
                globalSocket.off('cdrs_updated', onCdrUpdate);
            }
        };
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
        lastEvent
    };
};
