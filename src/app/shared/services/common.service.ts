import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  setLoader(state: boolean): void {
    this._loading.set(state);
  }
}
