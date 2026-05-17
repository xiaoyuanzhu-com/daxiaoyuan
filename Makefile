.PHONY: dev dev-backend dev-frontend docker-build docker-run

dev:
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	$(MAKE) -C backend run

dev-frontend:
	cd frontend && npm run dev

# Build the fullstack image (frontend + backend bundled together) locally.
docker-build:
	docker build -t ddxy:dev .

# Run the locally built image with the repo's data/ bind-mounted in, so
# edits made via the web UI land back in the source tree.
docker-run:
	docker run --rm -p 8080:8080 -v $(CURDIR)/data:/app/data ddxy:dev
