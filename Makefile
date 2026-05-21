SHELL := /bin/bash

.PHONY: dev dev-backend dev-frontend docker-build docker-run

# Build backend, then run ddxy + vite together. A single bash shell owns both
# children in its process group, so Ctrl+C (SIGINT to the foreground PGID)
# reaches everyone; the trap is a safety net that also handles SIGTERM and
# normal-exit cleanup. `exec` in each subshell strips the wrapper shell so
# kills land directly on ddxy / npm.
dev:
	@$(MAKE) -C backend build && \
	trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT; \
	(exec backend/bin/ddxy) & \
	(cd frontend && exec npm run dev) & \
	wait

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
