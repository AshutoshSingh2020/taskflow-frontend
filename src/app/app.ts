import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './shared/services/auth.service';
import { Navbar } from './layout/navbar/navbar';
import { ToastContainer } from './shared/components/toast/toast';
import { LoadingBar } from './shared/components/loading-bar/loading-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ToastContainer, LoadingBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private auth = inject(AuthService);
  readonly isAuthenticated = this.auth.isAuthenticated;
}
