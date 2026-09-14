import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../shared/common/api.service';
import { config } from '../../../shared/common/config';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SocketService } from '../../../shared/services/socket.service';

type StatusFilter = 'all' | 'pending' | 'completed';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskList implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private socketService = inject(SocketService);

  readonly currentUser = this.auth.currentUser;
  readonly role = this.auth.role;

  readonly tasks = signal<any[]>([]);
  readonly loading = signal(false);
  readonly statusFilter = signal<StatusFilter>('all');

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly pageSizeOptions = [10, 50, 100];

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const delta = 2;

    if (total <= 1) return [1];

    const pages: Array<number | '...'> = [1];
    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  });

  readonly assignableUsers = signal<any[]>([]);
  readonly teamLeads = signal<any[]>([]);
  readonly overviewTasks = signal<any[]>([]);

  readonly showForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly taskPendingDelete = signal<any | null>(null);
  readonly deleting = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: [''],
    assignedTo: [''],
    status: ['pending'],
  });

  readonly canAssign = computed(() => this.role() === 'manager' || this.role() === 'teamlead');

  readonly managerGroups = computed(() => {
    if (this.role() !== 'manager') return [];

    const groups = new Map<string, { teamLead: any; tasks: any[] }>();
    for (const tl of this.teamLeads()) {
      groups.set(tl.id, { teamLead: tl, tasks: [] });
    }

    const other: any[] = [];

    for (const task of this.overviewTasks()) {
      const assignee = task.assignedTo;
      let key: string | null = null;

      if (assignee?.role === 'teamlead') {
        key = assignee._id;
      } else if (assignee?.role === 'employee' && assignee?.teamLead) {
        key = assignee.teamLead;
      }

      if (key && groups.has(key)) {
        groups.get(key)!.tasks.push(task);
      } else {
        other.push(task);
      }
    }

    const result = Array.from(groups.values());
    if (other.length) {
      result.push({ teamLead: null, tasks: other });
    }
    return result;
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadTasks();
    this.loadOverview();

    this.socketService.connect();
    this.socketService.onTaskChanged(() => {
      this.toast.info('Task list updated');
      this.refreshTasks();
    });
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadTasks();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadTasks();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    const status = this.statusFilter();
    const query: any = { page: this.page(), limit: this.pageSize() };
    if (status !== 'all') query.status = status;

    this.api.apiRequest(config.getTasks, query).subscribe({
      next: (res: any) => {
        this.tasks.set(res.data.tasks);
        this.total.set(res.data.total);
        this.totalPages.set(res.data.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadOverview(): void {
    if (this.role() !== 'manager') return;
    this.api.apiRequest(config.getTasksOverview).subscribe((res: any) => {
      this.overviewTasks.set(res.data.tasks);
    });
  }

  private refreshTasks(): void {
    this.loadTasks();
    this.loadOverview();
  }

  private loadUsers(): void {
    const role = this.role();

    if (role === 'manager') {
      this.api.apiRequest(config.getUsers).subscribe((res: any) => {
        this.assignableUsers.set(res.data.users);
        this.teamLeads.set(res.data.users.filter((u: any) => u.role === 'teamlead'));
      });
    } else if (role === 'teamlead') {
      this.api.apiRequest(config.getUsers).subscribe((res: any) => {
        const self = this.currentUser();
        this.assignableUsers.set(self ? [self, ...res.data.users] : res.data.users);
      });
    }
  }

  openCreateForm(): void {
    this.editingTaskId.set(null);
    this.formError.set(null);
    this.form.reset({ title: '', description: '', assignedTo: '', status: 'pending' });
    this.showForm.set(true);
  }

  openEditForm(task: any): void {
    this.editingTaskId.set(task._id);
    this.formError.set(null);
    this.form.reset({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo?._id ?? '',
      status: task.status,
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const raw = this.form.getRawValue();
    const payload: any = {
      title: raw.title,
      description: raw.description,
    };
    if (this.canAssign() && raw.assignedTo) {
      payload.assignedTo = raw.assignedTo;
    }

    const editingId = this.editingTaskId();

    const request = editingId
      ? this.api.apiRequest(config.updateTask, { ...payload, status: raw.status, apiId: editingId })
      : this.api.apiRequest(config.createTask, payload);

    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Task updated' : 'Task created');
        this.refreshTasks();
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.message || 'Something went wrong';
        this.formError.set(message);
        this.toast.error(message);
      },
    });
  }

  toggleComplete(task: any): void {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    this.api.apiRequest(config.updateTask, { status: nextStatus, apiId: task._id }).subscribe({
      next: () => {
        this.toast.success(nextStatus === 'completed' ? 'Task marked as completed' : 'Task reopened');
        this.refreshTasks();
      },
      error: (err) => this.toast.error(err?.message || 'Could not update task'),
    });
  }

  requestDelete(task: any): void {
    this.taskPendingDelete.set(task);
  }

  cancelDelete(): void {
    this.taskPendingDelete.set(null);
  }

  confirmDelete(): void {
    const task = this.taskPendingDelete();
    if (!task) return;

    this.deleting.set(true);
    this.api.apiRequest(config.deleteTask, task._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.taskPendingDelete.set(null);
        this.toast.success('Task deleted');
        this.refreshTasks();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(err?.message || 'Could not delete task');
      },
    });
  }

  completedCount(tasks: any[]): number {
    return tasks.filter((t) => t.status === 'completed').length;
  }
}
