import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private tokenService = inject(TokenService);
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.tokenService.getToken();
    if (!token) return;

    this.socket = io(environment.socket_url, { auth: { token } });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onTaskChanged(callback: () => void): void {
    this.socket?.on('task:changed', callback);
  }
}
