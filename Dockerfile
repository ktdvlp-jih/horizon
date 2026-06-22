# syntax=docker/dockerfile:1

# ---- Stage 1: build the user React SPA ----
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 1b: build the admin React SPA (/admin) ----
FROM node:22-slim AS frontend-admin
WORKDIR /frontend-admin
COPY frontend-admin/package.json frontend-admin/package-lock.json* ./
RUN npm install
COPY frontend-admin/ ./
ENV VITE_BASE_PATH=/admin/
RUN npm run build

# ---- Stage 2: build the Spring Boot jar ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ---- Stage 3: runtime ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
ENV TZ=Asia/Seoul \
    HORIZON_SERVE_FRONTEND=true
COPY --from=build /workspace/build/libs/*.jar app.jar
COPY --from=frontend /frontend/dist ./frontend/dist
COPY --from=frontend-admin /frontend-admin/dist ./frontend-admin/dist
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
