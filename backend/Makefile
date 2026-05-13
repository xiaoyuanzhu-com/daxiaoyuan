.PHONY: build run test test-v clean fmt vet

build:
	go build -o bin/ddxy ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

test-v:
	go test -v ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

# Intentionally does not touch *.db — the SQLite file is the source of truth
# now that there is no seed mechanism. Delete it manually if you need to.
clean:
	rm -rf bin/ ddxy
