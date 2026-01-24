
import { Injectable, signal, computed, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

export type SocketConnectionStatus = 'connected' | 'disconnected' | 'connecting';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: Socket | undefined;
    private _connectionStatus = signal<SocketConnectionStatus>('disconnected');

    // Public signals
    public connectionStatus = computed(() => this._connectionStatus());
    public isConnected = computed(() => this._connectionStatus() === 'connected');

    constructor() {
        // Auto-connect in production or if configured
        this.connect();
    }

    connect() {
        if (this.socket?.connected) return;

        this._connectionStatus.set('connecting');

        this.socket = io({
            path: '/socket.io',
            transports: ['websocket', 'polling'], // Prioritize websocket
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true
        });

        this.setupListeners();
    }

    private setupListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[SocketService] Connected');
            this._connectionStatus.set('connected');
            this.joinAdminRoom();
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('[SocketService] Disconnected:', reason);
            this._connectionStatus.set('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('[SocketService] Connection Error:', error);
            this._connectionStatus.set('disconnected');
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log(`[SocketService] Reconnecting attempt #${attempt}`);
            this._connectionStatus.set('connecting');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this._connectionStatus.set('disconnected');
        }
    }

    joinAdminRoom() {
        this.emit('joinAdmin');
    }

    joinSession(sessionId: string) {
        this.emit('join', sessionId);
    }

    emit(eventName: string, data?: any) {
        if (this.socket) {
            this.socket.emit(eventName, data);
        }
    }

    on<T>(eventName: string): Observable<T> {
        return new Observable<T>((observer) => {
            if (!this.socket) {
                observer.error('Socket not initialized');
                return;
            }

            this.socket.on(eventName, (data: T) => {
                observer.next(data);
            });

            // Cleanup logic
            return () => {
                if (this.socket) {
                    this.socket.off(eventName);
                }
            };
        });
    }
}
