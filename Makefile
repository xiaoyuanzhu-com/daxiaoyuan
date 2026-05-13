.PHONY: dev dev-backend dev-frontend

dev:
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	$(MAKE) -C backend run

dev-frontend:
	cd frontend && npm run dev
