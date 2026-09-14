import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ApiService } from '../../../shared/common/api.service';
import { config } from '../../../shared/common/config';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private api = inject(ApiService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);

  readonly managers = signal<any[]>([]);
  readonly teamLeads = signal<any[]>([]);

  readonly roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'teamlead', label: 'Team Lead' },
    { value: 'manager', label: 'Manager' },
  ];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    role: ['employee', [Validators.required]],
    parentId: [''],
  });

  readonly selectedRole = signal(this.form.controls.role.value);

  readonly needsParent = computed(() => this.selectedRole() !== 'manager');
  readonly parentLabel = computed(() => (this.selectedRole() === 'teamlead' ? 'Manager' : 'Team Lead'));
  readonly parentOptions = computed(() =>
    this.selectedRole() === 'teamlead' ? this.managers() : this.teamLeads()
  );

  ngOnInit(): void {
    this.api.apiRequest(config.getManagers).subscribe((res: any) => this.managers.set(res.data.users));
    this.api.apiRequest(config.getTeamLeads).subscribe((res: any) => this.teamLeads.set(res.data.users));

    this.form.controls.role.valueChanges.subscribe((role) => {
      this.selectedRole.set(role);
      this.form.controls.parentId.reset('');
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.needsParent() && !this.form.controls.parentId.value) {
      this.toast.error(`Please select a ${this.parentLabel()}`);
      return;
    }

    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const payload: any = {
      username: raw.username,
      email: raw.email,
      password: raw.password,
      role: raw.role,
    };
    if (raw.role === 'teamlead') payload.manager = raw.parentId;
    if (raw.role === 'employee') payload.teamLead = raw.parentId;

    this.api.apiRequest(config.register, payload).subscribe({
      next: (res: any) => {
        this.auth.setSession(res.data);
        this.submitting.set(false);
        this.toast.success('Account created!');
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err?.message || 'Registration failed');
      },
    });
  }
}
