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

# Stage 3: minimal runtime — distroless static, runs as nonroot.
#
# Layer order is "least frequently changing first" for cache efficiency:
# data/ is the biggest layer (~19MB of school JSON + logo blobs) but
# changes only when schools are added; the binary is tiny but rebuilds
# on every code edit. Putting data first lets `docker push/pull` reuse
# the big layer across the common case of code-only changes.
#
# Backend does atomic writes back into the data dir (new/edited schools),
# so it must be owned by the nonroot user. In production the directory
# is typically bind-mounted from the host and the baked-in copy is just
# a default/dev seed.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app

COPY --chown=nonroot:nonroot data/ /data/
COPY --from=backend /out/ddxy /app/ddxy

ENV DDXY_ADDR=:8080 \
    DDXY_DATA_DIR=/data

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/ddxy"]
