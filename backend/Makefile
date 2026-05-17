.PHONY: build run test test-v clean fmt vet

build:
	go build -o bin/ddxy ./cmd/server

# Data lives at repo-root data/, outside the backend module — point the
# server at it explicitly so `make run` works from the backend/ subdir.
run:
	DDXY_DATA_DIR=$(realpath ../data) go run ./cmd/server

test:
	go test ./...

test-v:
	go test -v ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

clean:
	rm -rf bin/ ddxy
