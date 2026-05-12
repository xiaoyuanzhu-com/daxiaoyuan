.PHONY: build run test test-v seed clean fmt vet

build:
	go build -o bin/ddxy ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

test-v:
	go test -v ./...

seed:
	go run ./seed

fmt:
	go fmt ./...

vet:
	go vet ./...

clean:
	rm -rf bin/ ddxy *.db
