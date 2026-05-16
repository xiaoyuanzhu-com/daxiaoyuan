# syntax=docker/dockerfile:1.7

FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN go build -trimpath -ldflags="-s -w" -o /out/ddxy ./cmd/server

# Pre-create /data with nonroot (uid 65532) ownership so SQLite can write
# without needing a shell in the runtime image.
RUN mkdir -p /out/data && chown 65532:65532 /out/data

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/ddxy /app/ddxy
COPY --from=builder /out/data /data

ENV DDXY_ADDR=:8080 \
    DDXY_DB_PATH=/data/ddxy.db

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/ddxy"]
