# syntax=docker/dockerfile:1.7

# Stage 1: build the Vite + React frontend
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: build the Go backend with the frontend dist embedded
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
# Replace the placeholder dist with the freshly built one so //go:embed picks
# up the real SPA bundle.
RUN rm -rf web/dist
COPY --from=frontend /app/dist ./web/dist

ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN go build -trimpath -ldflags="-s -w" -o /out/ddxy ./cmd/server

# Pre-create /data with nonroot (uid 65532) ownership so SQLite can write
# without needing a shell in the runtime image.
RUN mkdir -p /out/data && chown 65532:65532 /out/data

# Stage 3: minimal runtime — distroless static, runs as nonroot
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=backend /out/ddxy /app/ddxy
COPY --from=backend /out/data /data

ENV DDXY_ADDR=:8080 \
    DDXY_DB_PATH=/data/ddxy.db

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/ddxy"]
