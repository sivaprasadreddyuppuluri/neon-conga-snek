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

# Deploys happen automatically after CI passes on main. This triggers one by hand,
# e.g. to roll back: make deploy REF=<earlier commit sha>
REF ?= main
deploy:
	gh workflow run deploy.yml --ref main -f ref=$(REF)
	@echo "Deploying $(REF). Watch it with: gh run list --workflow deploy.yml --limit 1"
	@echo "Live at https://sivaprasadreddyuppuluri.github.io/neon-conga-snek/"
