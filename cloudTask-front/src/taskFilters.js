export function filterTasks(tasks, filter, searchUsername) {
  const username = searchUsername.trim().toLocaleLowerCase();
  const filtered = tasks.filter((task) => {
    if (username && !task.assignedUser?.username.toLocaleLowerCase().includes(username)) return false;
    if (filter === 'COMPLETED') return task.completed;
    if (filter === 'ACTIVE') return !task.completed;
    if (filter === 'HIGH_PRIORITY') return task.priority === 1;
    return true;
  });
  if (filter === 'DATE') {
    filtered.sort((a, b) => {
      if (!a.dueDate) return b.dueDate ? 1 : 0;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }
  return filtered;
}
