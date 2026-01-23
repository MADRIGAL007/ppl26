
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from './auth';
import * as db from './db';

let io: Server;
const socketSessionMap = new Map<string, string>();

export const initSocket = (httpServer: HttpServer, corsOptions: any) => {
    io = new Server(httpServer, {
        cors: corsOptions
    });

    io.on('connection', (socket) => {
        console.log('[Socket] Client connected:', socket.id);

        socket.on('join', (sessionId) => {
            socket.join(sessionId);
            socketSessionMap.set(socket.id, sessionId);
            console.log(`[Socket] ${socket.id} joined session room: ${sessionId}`);
        });

        socket.on('joinAdmin', () => {
            socket.join('admin');
            console.log(`[Socket] ${socket.id} joined ADMIN room`);
        });

        socket.on('joinHypervisor', (token: string) => {
            const user = verifyToken(token);
            if (user && user.role === 'hypervisor') {
                socket.join('hypervisor-logs');
                console.log(`[Socket] ${socket.id} joined HYPERVISOR logs`);
            } else {
                console.warn(`[Socket] Unauthorized attempt to join hypervisor logs: ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Client disconnected:', socket.id);

            // Retrieve associated session ID
            const sessionId = socketSessionMap.get(socket.id);
            if (sessionId) {
                // Force "Offline" status by setting lastSeen > 1 min ago
                // Using 70000ms (70s) to be safely over the 60s threshold
                const offlineTime = Date.now() - 70000;
                db.updateLastSeen(sessionId, offlineTime).then(() => {
                    // Notify admins to update list immediately
                    io.emit('sessions-updated');
                });

                socketSessionMap.delete(socket.id);
            }
        });
    });

    return io;
};

export const getSocketIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
