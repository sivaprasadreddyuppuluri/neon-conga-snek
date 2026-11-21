# Oberchecker project contract: every project provides these targets.
.PHONY: setup dev test lint build deploy

# Browser tests need Playwright's Chromium. On CI (GitHub Actions sets CI=true) its system
# libraries are installed too, because GitHub's machines don't have them.
PLAYWRIGHT_DEPS := $(if $(CI),--with-deps,)

setup:
	npm ci
	npx playwright install $(PLAYWRIGHT_DEPS) chromium

dev:
	npm run dev

# Unit tests for the game rules, then browser tests (gameplay flow + axe accessibility)
# against a production build.
test:
	npm test
	npm run build
	npm run test:e2e

lint:
	npm run lint

build:
	npm run build

deploy:
	@echo "not deployed yet (see the oberchecker deploy skill)"
