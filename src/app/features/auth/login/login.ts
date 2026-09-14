import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../shared/common/api.service';
import { config } from '../../../shared/common/config';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    this.api.apiRequest(config.login, this.form.getRawValue()).subscribe({
      next: (res: any) => {
        this.auth.setSession(res.data);
        this.submitting.set(false);
        this.toast.success('Welcome back!');
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err?.message || 'Invalid email or password');
      },
    });
  }
}
