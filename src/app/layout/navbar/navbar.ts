import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly currentUser = this.auth.currentUser;

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
