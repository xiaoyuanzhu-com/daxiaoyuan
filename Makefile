.PHONY: dev dev-backend dev-frontend docker-build docker-run docker-clean

dev:
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	$(MAKE) -C backend run

dev-frontend:
	cd frontend && npm run dev

# Build the fullstack image (frontend + backend bundled together) locally.
docker-build:
	docker build -t ddxy:dev .

# Run the locally built image with a host-mounted DB so data persists.
docker-run:
	mkdir -p .docker-data
	docker run --rm -p 8080:8080 -v $(CURDIR)/.docker-data:/data ddxy:dev

docker-clean:
	rm -rf .docker-data
