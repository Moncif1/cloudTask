# CloudTask frontend

React 19 + Vite 8. Utiliser Node 22.12+.

```bash
nvm install
nvm use
npm ci
npm run dev
```

Ouvrir <http://localhost:5173>. Le backend doit être démarré séparément.
Le proxy `/api` cible `http://127.0.0.1:8080` ; pour un autre port :

```bash
BACKEND_URL=http://127.0.0.1:8081 npm run dev
```

Validation :

```bash
npm run lint
npm test
npm run build
```

Voir le [guide principal](../README.md) pour MySQL, la configuration backend,
le dépannage, les limites d'authentification et les précautions de déploiement.
