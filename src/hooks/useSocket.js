import { useEffect, useRef } from 'react';
import { connectSocket } from '../utils/socket';

/**
 * Hook that connects to socket.io and subscribes to events.
 * @param {Object} handlers - Map of event name to handler function
 *
 * Includes a built-in connect_error handler that logs connection failures
 * to the console without crashing the component (reviewer fix M6).
 */
export function useSocket(handlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const socket = connectSocket();

        const boundHandlers = {};
        for (const [event, handler] of Object.entries(handlersRef.current)) {
            boundHandlers[event] = (...args) => handlersRef.current[event]?.(...args);
            socket.on(event, boundHandlers[event]);
        }

        // Built-in connect_error handler (reviewer M6): log but don't crash
        const onConnectError = (err) => {
            // eslint-disable-next-line no-console
            console.warn('[socket] connection error:', err.message);
        };
        socket.on('connect_error', onConnectError);

        return () => {
            for (const [event, handler] of Object.entries(boundHandlers)) {
                socket.off(event, handler);
            }
            socket.off('connect_error', onConnectError);
        };
    }, []);
}
