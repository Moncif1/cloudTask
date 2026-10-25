import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTasks } from './taskFilters.js';
import { getErrorMessage } from './services/api.js';

const tasks = [
  { id: 1, completed: false, priority: 1, dueDate: null, assignedUser: { username: 'Alice' } },
  { id: 2, completed: true, priority: 2, dueDate: '2026-12-02', assignedUser: { username: 'Alice' } },
  { id: 3, completed: false, priority: 1, dueDate: '2026-12-01', assignedUser: null }
];

test('filters by status and priority without changing dashboard source data', () => {
  assert.deepEqual(filterTasks(tasks, 'COMPLETED', '').map((t) => t.id), [2]);
  assert.deepEqual(filterTasks(tasks, 'ACTIVE', '').map((t) => t.id), [1, 3]);
  assert.deepEqual(filterTasks(tasks, 'HIGH_PRIORITY', '').map((t) => t.id), [1, 3]);
  assert.equal(tasks.length, 3);
});

test('search combines with filters and supports case and whitespace', () => {
  assert.deepEqual(filterTasks(tasks, 'ACTIVE', ' ALI ').map((t) => t.id), [1]);
  assert.deepEqual(filterTasks(tasks, 'ALL', 'unknown'), []);
  assert.equal(filterTasks(tasks, 'ALL', ' ').length, 3);
});

test('date sort retains undated tasks at the end and never mutates source order', () => {
  assert.deepEqual(filterTasks(tasks, 'DATE', '').map((t) => t.id), [3, 2, 1]);
  assert.deepEqual(tasks.map((t) => t.id), [1, 2, 3]);
});

test('reports backend errors rather than always claiming a duplicate username', () => {
  assert.equal(getErrorMessage({ response: { data: { message: 'Duplicate' }, status: 409 } }), 'Duplicate');
  assert.match(getErrorMessage({ response: { status: 500 } }), /HTTP 500/);
  assert.match(getErrorMessage(new Error('Network Error')), /Serveur inaccessible/);
});
