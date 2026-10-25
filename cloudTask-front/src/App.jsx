import { useState } from 'react';
import {
  getTasks,
  createTask,
  deleteTask,
  updateTask,
  getUsers,
  deleteUser,
  loginUser,
  registerUser,
  getErrorMessage
} from './services/api';
import { filterTasks } from './taskFilters';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [searchUsername, setSearchUsername] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState('MEMBRE');
  const [authError, setAuthError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(false);

  const loadData = async () => {
    const [tasksData, usersData] = await Promise.all([getTasks(), getUsers()]);
    setTasks(tasksData);
    setUsers(usersData);
    setAssignedUserId((selected) =>
      usersData.some((user) => String(user.id) === String(selected)) ? selected : '');
  };

  const runAction = async (action) => {
    setPending(true);
    setActionError('');
    try {
      await action();
      await loadData();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setActionError('Le titre est obligatoire.');
      return;
    }
    await runAction(async () => {
      const isManager = currentUser.role === 'CHEF_DE_PROJET';
      const targetUserId = isManager ? assignedUserId : currentUser.id;

      await createTask({
        title: title.trim(),
        completed: false,
        priority: Number(priority),
        dueDate: dueDate || null,
        assignedUser: targetUserId ? { id: Number(targetUserId) } : null
      });
      setTitle('');
      setPriority(1);
      setDueDate('');
    });
  };

  const handleDelete = async (id) => {
    await runAction(() => deleteTask(id));
  };

  // Fonction pour supprimer un utilisateur (visible par le manager)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    await runAction(() => deleteUser(userId));
  };

  const handleToggleComplete = async (task) => {
    const isManager = currentUser.role === 'CHEF_DE_PROJET';
    const isAssignedToMe = task.assignedUser && task.assignedUser.id === currentUser.id;

    if (!isManager && !isAssignedToMe) {
      setActionError("Vous ne pouvez modifier que les tâches qui vous sont assignées.");
      return;
    }

    await runAction(() => updateTask(task.id, {
      ...task,
      completed: !task.completed
    }));
  };

  const handleFilterChange = (type) => {
    setFilter(type);
  };

  const handleSearchByUser = (e) => {
    setSearchUsername(e.target.value);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setPending(true);
    setAuthError('');
    setActionError('');
    try {
      const credentials = {
        username: usernameInput.trim(),
        password: passwordInput
      };
      const loggedUser = isRegistering
        ? await registerUser({ ...credentials, role: roleInput })
        : await loginUser(credentials);
      setCurrentUser(loggedUser);
      setPasswordInput('');
      setFilter('ALL');
      setSearchUsername('');
      try {
        await loadData();
      } catch (error) {
        setActionError(getErrorMessage(error));
      }
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', width: '380px', maxWidth: '100%', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>
            {isRegistering ? "cloudTask - Inscription" : "cloudTask - Connexion"}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px' }}>
            {isRegistering ? "Créez votre compte pour commencer :" : "Entrez vos identifiants pour vous connecter :"}
          </p>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <fieldset disabled={pending} className="auth-fields">
            <input
              type="text"
              aria-label="Nom d'utilisateur"
              autoComplete="username"
              maxLength={255}
              placeholder="Nom d'utilisateur"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569' }}
              required
            />
            <input
              type="password"
              aria-label="Mot de passe"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              maxLength={255}
              placeholder="Mot de passe"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569' }}
              required
            />

            {isRegistering && (
              <select
                aria-label="Rôle"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569' }}
              >
                <option value="MEMBRE">Membre</option>
                <option value="CHEF_DE_PROJET">Chef de Projet</option>
              </select>
            )}

            <button
              type="submit"
              style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {pending ? "Chargement..." : isRegistering ? "S'inscrire" : "Se connecter"}
            </button>
            </fieldset>
          </form>

          {authError && (
            <p role="alert" style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '15px' }}>{authError}</p>
          )}

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '20px' }}>
            {isRegistering ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}
            <button
              type="button"
              disabled={pending}
              className="auth-switch"
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
              style={{ color: '#38bdf8', cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }}
            >
              {isRegistering ? "Se connecter" : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const isManager = currentUser.role === 'CHEF_DE_PROJET';
  const visibleTasks = filterTasks(tasks, filter, searchUsername);

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Gestion des Tâches - cloudTask</h1>
            <p className="subtitle">Pilotez vos projets cloud avec élégance</p>
          </div>
          <div style={{ background: '#1e293b', padding: '8px 15px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
              👤 <strong>{currentUser.username}</strong> <span style={{ color: '#38bdf8' }}>({currentUser.role})</span>
            </span>
            <button
              disabled={pending}
              onClick={() => {
                setCurrentUser(null);
                setTasks([]);
                setUsers([]);
                setAssignedUserId('');
                setTitle('');
                setPriority(1);
                setDueDate('');
                setUsernameInput('');
                setPasswordInput('');
                setIsRegistering(false);
                setRoleInput('MEMBRE');
                setAuthError('');
                setActionError('');
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {actionError && (
        <div role="alert" className="error-banner">
          <p>{actionError}</p>
          <button disabled={pending} onClick={() => runAction(async () => {})}>Réessayer le chargement</button>
        </div>
      )}
      {pending && <p role="status">Chargement...</p>}

      {/* Tableau de bord manager avec option de suppression des utilisateurs */}
      {isManager && (
        <div className="progress-dashboard">
          <h3>📊 Suivi de l'avancement de l'équipe</h3>
          <div className="dashboard-grid">
            {users.map(user => {
              const userTasks = tasks.filter(t => t.assignedUser?.id === user.id);
              const completedTasks = userTasks.filter(t => t.completed);
              const percentage = userTasks.length > 0
                ? Math.round((completedTasks.length / userTasks.length) * 100)
                : 0;

              return (
                <div key={user.id} className="user-progress-card">
                  <div className="user-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>👤 {user.username}</strong>
                      <span className="user-role">({user.role})</span>
                    </div>
                    <button
                      disabled={pending || user.id === currentUser.id}
                      onClick={() => handleDeleteUser(user.id)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      title="Supprimer cet utilisateur"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="progress-stats">
                    <span>{completedTasks.length} / {userTasks.length} terminées</span>
                    <span className="progress-percentage">{percentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulaire d'ajout de tâche */}
      <form onSubmit={handleCreate} className="task-form">
        <fieldset disabled={pending} className="task-fields">
        <input
          type="text"
          aria-label="Titre de la tâche"
          required
          maxLength={255}
          placeholder={isManager ? "Nouvelle tâche pour l'équipe..." : "Nouvelle tâche personnelle..."}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="task-input"
        />

        <select
          aria-label="Priorité"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="priority-select"
        >
          <option value="1">Priorité : Haute (1)</option>
          <option value="2">Priorité : Moyenne (2)</option>
          <option value="3">Priorité : Basse (3)</option>
        </select>

        <input
          type="date"
          aria-label="Date d'échéance"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569' }}
        />

        {isManager && (
          <select
            aria-label="Utilisateur assigné"
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
            className="user-select"
          >
            <option value="">-- Assigner à un membre --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role})
              </option>
            ))}
          </select>
        )}

        <button type="submit" className="btn-add">Ajouter</button>
        </fieldset>
      </form>

      {/* Barre de filtres et de recherche */}
      <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <button className={filter === 'ALL' ? 'filter-btn active' : 'filter-btn'} onClick={() => handleFilterChange('ALL')}>Toutes</button>
        <button className={filter === 'ACTIVE' ? 'filter-btn active' : 'filter-btn'} onClick={() => handleFilterChange('ACTIVE')}>À faire</button>
        <button className={filter === 'COMPLETED' ? 'filter-btn active' : 'filter-btn'} onClick={() => handleFilterChange('COMPLETED')}>Terminées</button>
        <button className={filter === 'HIGH_PRIORITY' ? 'filter-btn active' : 'filter-btn'} onClick={() => handleFilterChange('HIGH_PRIORITY')}>Urgentes (P1)</button>
        <button className={filter === 'DATE' ? 'filter-btn active' : 'filter-btn'} onClick={() => handleFilterChange('DATE')}>📅 Par Date</button>

        <input
          type="text"
          aria-label="Filtrer par utilisateur"
          placeholder="🔍 Filtrer par utilisateur..."
          value={searchUsername}
          onChange={handleSearchByUser}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: '#0f172a',
            color: '#fff',
            border: '1px solid #475569',
            marginLeft: 'auto',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* Liste des tâches */}
      <div className="task-list-container">
        {visibleTasks.length === 0 ? (
          <p className="no-tasks">Aucune tâche trouvée.</p>
        ) : (
          <ul className="task-list">
            {visibleTasks.map((task) => {
              const isAssignedToMe = task.assignedUser && task.assignedUser.id === currentUser.id;
              const canModify = isManager || isAssignedToMe;

              return (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="task-info">
                    <input
                      type="checkbox"
                      aria-label={`Terminer ${task.title}`}
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      disabled={pending || !canModify}
                      style={{ cursor: canModify ? 'pointer' : 'not-allowed', opacity: canModify ? 1 : 0.4 }}
                      className="task-checkbox"
                    />
                    <span className="task-title">{task.title}</span>

                    {task.assignedUser && (
                      <span className="assigned-user-badge" style={{ background: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#38bdf8', marginLeft: '10px' }}>
                        👤 {task.assignedUser.username}
                      </span>
                    )}

                    {task.dueDate && (
                      <span className="due-date-badge" style={{ background: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#facc15', marginLeft: '5px' }}>
                        📅 {task.dueDate}
                      </span>
                    )}

                    <span className={`priority-badge p-${task.priority}`} style={{ marginLeft: '10px' }}>
                      {task.priority === 1 ? 'Haute' : task.priority === 2 ? 'Moyenne' : 'Basse'}
                    </span>
                  </div>
                  <button disabled={pending || !canModify} onClick={() => handleDelete(task.id)} className="btn-delete">Supprimer</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;