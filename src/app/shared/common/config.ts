export const config: any = {
  register: { endURL: 'auth/register', type: 'Post' },
  login: { endURL: 'auth/login', type: 'Post' },
  me: { endURL: 'auth/me', type: 'Get' },
  getManagers: { endURL: 'auth/managers', type: 'Get' },
  getTeamLeads: { endURL: 'auth/teamleads', type: 'Get' },

  getUsers: { endURL: 'users', type: 'Get' },

  getTasks: { endURL: 'tasks', type: 'Get' },
  getTasksOverview: { endURL: 'tasks/overview', type: 'Get' },
  createTask: { endURL: 'tasks', type: 'Post' },
  updateTask: { endURL: 'tasks/', type: 'Put' },
  deleteTask: { endURL: 'tasks/', type: 'Delete' },
};
