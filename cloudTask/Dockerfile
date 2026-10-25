# Etape de construction : Maven compile, teste et genere le JAR avec Java 21.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml ./
# Met les dependances en cache tant que pom.xml ne change pas.
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp verify

# Image finale : Java uniquement, sans Maven ni code source.
FROM eclipse-temurin:21-jre-jammy
# Execute l'application sans les privileges root.
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=build --chown=app:app /build/target/cloudTask-0.0.1-SNAPSHOT.jar app.jar
USER app
# Indique le port interne ; Compose choisit les ports exposes sur la machine.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
