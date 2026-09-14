import { Injectable, computed, signal } from '@angular/core';
import { TokenService } from './token.service';

const USER_KEY = 'testflow_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _currentUser = signal<any>(this.readStoredUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly role = computed(() => this._currentUser()?.role ?? null);

  constructor(private tokenService: TokenService) {}

  setSession(data: any): void {
    this.tokenService.setToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this._currentUser.set(data.user);
  }

  logout(): void {
    this.tokenService.clearToken();
    localStorage.removeItem(USER_KEY);
    this._currentUser.set(null);
  }

  private readStoredUser(): any {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
