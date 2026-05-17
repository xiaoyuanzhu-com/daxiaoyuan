.PHONY: build run test test-v clean fmt vet

build:
	go build -o bin/ddxy ./cmd/server

# Server reads `./data` relative to cwd, so run from repo root.
# `exec` (not `go run`) so the recipe shell is replaced by the binary —
# otherwise Ctrl+C on `make dev` kills the `go run` wrapper but orphans
# the compiled server binary, leaking the :8080 port.
run: build
	cd .. && exec backend/bin/ddxy

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
