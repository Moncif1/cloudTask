# CloudTask

Application académique de gestion de tâches réalisée dans le cadre du Master
Génie Logiciel pour le Cloud Computing (GLCC).

- **Backend :** Java 21, Spring Boot 4, Spring Data JPA, MySQL.
- **Frontend :** React 19, Vite 8, Axios.
- **Fonctions :** inscription/connexion, rôles membre/chef de projet, tâches avec
  priorité et échéance, affectation, filtres et suivi de l'équipe.

```text
cloudTask/
├── cloudTask/         # Backend
└── cloudTask-front/   # Frontend
```

## Prérequis

- **JDK 21**, actif pour `java`, `javac` et `JAVA_HOME` si cette variable est définie.
- **Node.js 22.12+** (branche 22 recommandée), avec npm.
- **MySQL Server 8+**, démarré localement.
- Git. Maven n'a pas besoin d'être installé : le wrapper est fourni.

Sur Ubuntu/WSL :

```bash
sudo apt update
sudo apt install openjdk-21-jdk mysql-server
sudo service mysql start
```

Avec [nvm](https://github.com/nvm-sh/nvm) déjà installé :

```bash
cd cloudTask-front
nvm install
nvm use
cd ..
```

Vérifier les versions avant de continuer :

```bash
java -version
javac -version
node --version
npm --version
```

## Démarrage local

Pour démarrer les trois services avec Docker plutôt qu'installer Java, Node et
MySQL sur la machine, suivre le [guide Docker Compose](./README-cloud.md).

Les commandes ci-dessous sont prévues pour Linux/WSL. Commencer à la racine du
dépôt, celle qui contient les deux dossiers `cloudTask` et `cloudTask-front`.

### 1. Préparer MySQL

```bash
sudo mysql
```

Pour une première installation, exécuter dans la console MySQL :

```sql
CREATE DATABASE cloudtask_db CHARACTER SET utf8mb4;
CREATE USER 'cloudtask'@'localhost' IDENTIFIED BY 'REPLACE_WITH_YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON cloudtask_db.* TO 'cloudtask'@'localhost';
EXIT;
```

Remplacer le mot de passe d'exemple. Si la base ou l'utilisateur existe déjà,
les réutiliser avec leurs identifiants actuels : ne pas les supprimer.

Tester la connexion (le mot de passe est demandé sans apparaître dans la commande) :

```bash
mysql -h 127.0.0.1 -u cloudtask -p cloudtask_db
```

Quitter avec `EXIT;`.

### 2. Configurer le backend

Depuis la racine du dépôt, copier le modèle sans écraser une configuration existante :

```bash
cp -n cloudTask/src/main/resources/application-local.properties.example \
      cloudTask/src/main/resources/application-local.properties
```

Modifier **`application-local.properties`** :

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/cloudtask_db
spring.datasource.username=cloudtask
spring.datasource.password=REPLACE_WITH_YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
```

Ce fichier est ignoré par Git et chargé automatiquement. `update` crée/met à jour
les tables pour le développement local. Sans cet override, le backend utilise `validate` et attend un schéma existant.

Sans fichier local, la connexion peut aussi être fournie par `DB_URL`, `DB_USERNAME`
et `DB_PASSWORD`. `PORT` permet de modifier le port HTTP.

### 3. Lancer le backend (terminal 1)

Depuis la racine :

```bash
cd cloudTask
./mvnw clean spring-boot:run
```

Attendre **`Started CloudTaskApplication`**, sans erreur après ce message, et garder
ce terminal ouvert. Un simple `BUILD SUCCESS` ne prouve pas que le serveur fonctionne.

- API : <http://localhost:8080/api/tasks>
- Documentation interactive : <http://localhost:8080/swagger-ui/index.html>
- OpenAPI JSON : <http://localhost:8080/v3/api-docs>

Vérification dans un autre terminal :

```bash
curl -i http://localhost:8080/api/tasks
```

Réponse attendue : `200` et un tableau JSON, par exemple `[]`.

### 4. Lancer le frontend (terminal 2)

Dans un **nouveau terminal**, repartir de la racine du dépôt :

```bash
cd cloudTask-front
nvm use                 # Si Node est géré avec nvm
npm ci
npm run dev
```

Ouvrir **<http://localhost:5173>**. Vite utilise un port fixe ; s'il est occupé,
il signale une erreur au lieu de changer silencieusement de port.

Les requêtes du navigateur utilisent `/api`. Le proxy Vite les transmet au backend
sur `127.0.0.1:8080`, ce qui évite les appels directs cross-origin en développement.
Si le backend utilise un autre port :

```bash
BACKEND_URL=http://127.0.0.1:8081 npm run dev
```

`VITE_API_BASE_URL` permet de remplacer `/api` lors de la construction du frontend.
Pour un frontend construit avec `npm run build`, configurer un reverse proxy `/api`
vers le backend ou fournir cette variable à la construction ; les fichiers statiques
seuls ne lancent pas l'API. `npm run preview` n'est pas le serveur de développement.

### 5. Essayer l'application

1. Créer un compte de test ; choisir `Chef de Projet` pour voir le tableau de bord.
2. Ajouter une tâche, avec ou sans date et affectation.
3. La terminer, filtrer/rechercher et vérifier le suivi de l'équipe.
4. Créer un membre et vérifier son affichage et ses tâches.
5. Supprimer les tâches d'un utilisateur avant de supprimer ce dernier.

L'interface désactive la suppression de son propre compte et la modification ou
suppression des tâches d'autres membres pour un compte membre.

Les filtres et la recherche se combinent. Le tri par date garde les tâches sans
échéance à la fin. Le tableau de bord calcule les totaux sur toutes les tâches,
indépendamment des filtres. Après une modification, les données sont rechargées.

## Tests

Backend, depuis `cloudTask/` :

```bash
./mvnw test
```

Les tests HTTP démarrent une instance sur un port aléatoire avec une base **H2 en
mémoire**, sans lire les identifiants locaux ni modifier MySQL. Ils couvrent
inscription, connexion, validation, conflits, tâches, filtres, CORS et OpenAPI.

Frontend, depuis `cloudTask-front/` :

```bash
npm run lint
npm test
npm run build
```

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| Java incompatible / `class file has wrong version` | Activer JDK 21 et vérifier `JAVA_HOME` ainsi que `bash ./mvnw -version`. |
| `Unable to determine Dialect` | Vérifier MySQL, l'URL JDBC, le nom de base et les identifiants. Ne pas masquer le problème en forçant un dialecte. |
| `Access denied` / `Unknown database` | Tester la connexion avec la commande MySQL ci-dessus et corriger le fichier local. |
| Tables manquantes | Vérifier `spring.jpa.hibernate.ddl-auto=update` dans le fichier local. |
| Port 8080 occupé / réponse Python | Identifier le processus avec `sudo lsof -nP -iTCP:8080 -sTCP:LISTEN`. Arrêter uniquement un processus reconnu, ou utiliser `PORT=8081` et adapter `BACKEND_URL`. |
| `/api/users` retourne 404 | Redémarrer avec `bash ./mvnw clean spring-boot:run`. Le package principal doit être `cloudtask`, comme les contrôleurs. |
| Inscription impossible | Lire le message affiché : `409` = conflit, `400` = données invalides, absence de réponse = backend/proxy inaccessible. |
| Erreur CORS | Utiliser le frontend Vite et ses URLs relatives `/api`. Pour des appels directs, `CORS_ALLOWED_ORIGINS` accepte une liste d'origines séparées par des virgules ; localhost et 127.0.0.1 sur 5173 sont autorisés par défaut. |
| Vite/Oxlint : native binding manquant | Vérifier Node 22.12+ puis relancer `npm ci` avec les dépendances optionnelles activées. Ne pas supprimer le lockfile comme premier correctif. |

Après une modification Java ou de configuration, redémarrer le backend si nécessaire.
Après modification de `BACKEND_URL` ou d'une variable Vite, redémarrer Vite.

## Limites actuelles

Cette version reste un **prototype local**, pas une application prête à être exposée :

- La connexion vérifie les identifiants mais ne crée pas de session authentifiée serveur.
- Le choix du rôle reste libre à l'inscription ; les restrictions de rôle sont uniquement UI.
- Les mots de passe ne sont plus renvoyés par l'API, mais restent stockés en clair.
  Utiliser uniquement des comptes et mots de passe de test.
- Le frontend perd la connexion à son rechargement ; les tâches restent en base.
- Les listes ne sont pas paginées et ne se synchronisent pas en temps réel entre navigateurs.

Le durcissement de l'authentification et des rôles est volontairement hors du périmètre
des correctifs fonctionnels actuels.

## Roadmap

- [x] Backend Spring Boot + MySQL
- [x] Frontend React et démarrage local documenté
- [x] Configuration locale non versionnée
- [x] Validation, messages d'erreur et tests de régression
- [ ] Authentification serveur, contrôle des rôles et BCrypt
- [x] Docker / Docker Compose (voir [README-cloud.md](./README-cloud.md))
- [ ] CI/CD
- [ ] Déploiement cloud

## Auteur

**Loubna Toubouh**
