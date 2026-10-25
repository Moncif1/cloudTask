# CloudTask avec Docker

Une configuration simple pour lancer le projet avec trois services :

- **frontend** : React servi par Nginx ;
- **backend** : API Spring Boot avec Java 21 ;
- **db** : MySQL 8.4, avec un volume pour conserver les données.

Seul le frontend est accessible sur la machine, à <http://localhost:8088>.

## 1. Prérequis

Installer et démarrer Docker Engine ou Docker Desktop, avec Docker Compose v2+.

```bash
docker --version
docker compose version
```

Java, Node et MySQL n'ont pas besoin d'être installés sur la machine :
Docker les fournit.

## 2. Configuration

Depuis la racine du dépôt, où se trouve `docker-compose.yaml` :

```bash
cp -n .env.example .env
```

Remplir les deux mots de passe dans `.env` :

```dotenv
MYSQL_PASSWORD=YOUR_DATABASE_PASSWORD
MYSQL_ROOT_PASSWORD=YOUR_DIFFERENT_ROOT_PASSWORD
APP_PORT=8088
```

Choisir deux mots de passe différents. Ne pas committer `.env` : il est ignoré par Git.

## 3. Démarrer

```bash
docker compose up --build -d
```

Le premier build prend quelques minutes et exécute les tests de l'application.
Ouvrir ensuite **<http://localhost:8088>** et créer un compte de test.
Choisir `Chef de Projet` pour afficher le tableau de bord.

MySQL peut prendre un peu de temps au premier lancement.

## Commandes utiles

```bash
# Voir les journaux
docker compose logs -f

# Reconstruire après une modification du code
docker compose up --build -d

# Arrêter en conservant les conteneurs
docker compose stop

# Relancer
docker compose start

# Arrêter et retirer les conteneurs, sans supprimer les données MySQL
docker compose down
```

Les données restent dans le volume `cloudtask_mysql-data`.
**Ne pas utiliser `docker compose down -v` si vous souhaitez les conserver.**

Pour lancer sans Docker, consulter le [README principal](./README.md).
