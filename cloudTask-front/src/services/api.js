import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || '/api',
  timeout: 10000
});

export const getTasks = async () => (await api.get('/tasks')).data;
export const createTask = async (task) => (await api.post('/tasks', task)).data;
export const deleteTask = async (id) => (await api.delete(`/tasks/${id}`)).data;
export const updateTask = async (id, task) => (await api.put(`/tasks/${id}`, task)).data;
export const getTasksByPriority = async (priority) =>
  (await api.get(`/tasks/priority/${priority}`)).data;
export const getTasksByCompletedStatus = async (status) =>
  (await api.get(`/tasks/completed/${status}`)).data;
export const getUsers = async () => (await api.get('/users')).data;
export const deleteUser = async (id) => (await api.delete(`/users/${id}`)).data;
export const getTasksByUser = async (id) => (await api.get(`/tasks/user/${id}`)).data;
export const getTasksByUsername = async (username) =>
  (await api.get('/tasks/search/user', { params: { username } })).data;
export const loginUser = async (credentials) => (await api.post('/users/login', credentials)).data;
export const registerUser = async (user) => (await api.post('/users', user)).data;
export const getTasksSortedByDate = async () => (await api.get('/tasks/sorted/date')).data;

export function getErrorMessage(error) {
  if (typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  if (!error.response) {
    return 'Serveur inaccessible. Vérifiez que le backend est démarré et que le proxy est configuré.';
  }
  return `La requête a échoué (HTTP ${error.response.status}). Réessayez ou consultez le terminal du backend.`;
}
