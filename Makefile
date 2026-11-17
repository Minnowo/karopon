
VERSION := $(shell git describe --tags --abbrev=0)
COMMIT  := $(shell git rev-parse --verify HEAD)
DATE    := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

LDFLAGS := -s -w
LDFLAGS += -X main.BuildMode=prod
LDFLAGS += -X main.BuildDate=$(DATE)
LDFLAGS += -X main.BuildCommit=$(COMMIT)
LDFLAGS += -X main.BuildVersion=$(VERSION)

TAGS    := netgo osusergo

UI       := ./src/ui
ASSETS   := ./src/assets
SITE_SRC := ./main.go
SITE_DST := ./main.o

# Go runs on the host. npm and golangci-lint run in containers so the host
# needs only Go, gcc (for CGO_ENABLED=1 tests) and docker.
GO             ?= go
NODE_IMAGE     ?= node:22-trixie-slim
GOLANGCI_IMAGE ?= golangci/golangci-lint:v2.15.0

HOST_UID    := $(shell id -u)
HOST_GID    := $(shell id -g)
HOST_GOPATH := $(shell $(GO) env GOPATH 2>/dev/null || echo $(HOME)/go)
HOST_CACHE  := $(HOME)/.cache

# The repo is mounted at /work. .docker-home (gitignored) is HOME inside the
# containers so npm and lint caches persist between runs.
DOCKER_RUN := docker run --rm \
	-u $(HOST_UID):$(HOST_GID) \
	-v "$(CURDIR):/work" \
	-e HOME=/work/.docker-home

NPM := $(DOCKER_RUN) -w /work/src/ui \
	-e npm_config_update_notifier=false \
	$(NODE_IMAGE) npm

GOLANGCI := $(DOCKER_RUN) -w /work \
	-v "$(HOST_GOPATH)/pkg/mod:/gomod" \
	-v "$(HOST_CACHE)/go-build:/gocache" \
	-e GOMODCACHE=/gomod \
	-e GOCACHE=/gocache \
	-e GOLANGCI_LINT_CACHE=/work/.docker-home/.cache/golangci-lint \
	$(GOLANGCI_IMAGE) golangci-lint


download-tools:
	docker pull $(NODE_IMAGE)
	docker pull $(GOLANGCI_IMAGE)

install-go:
	go mod download

install-js:
	$(NPM) ci

# Reinstall UI dependencies only when the lockfile changes.
$(UI)/node_modules: $(UI)/package-lock.json
	$(NPM) ci
	touch $@

generate: $(UI)/node_modules
	$(NPM) run build

format: format-go format-js

format-js: $(UI)/node_modules
	$(NPM) exec -- prettier . --write

format-go:
	mkdir -p "$(HOST_GOPATH)/pkg/mod" "$(HOST_CACHE)/go-build"
	$(GOLANGCI) fmt

# Run every check. Read-only: nothing is reformatted or fixed in place.
# Must pass before a commit. Postgres tests run only if TEST_POSTGRES_DSN is set.
.PHONY: check check-ascii check-go-mod check-go-fmt check-go-lint check-go-test check-ui
check: check-ascii check-ui check-go-mod check-go-fmt check-go-lint check-go-test
	@echo "==> all checks passed"

# Tracked and new (not ignored) text files must be ASCII only. See AGENTS.md rule 1.
check-ascii:
	@echo "==> ascii"
	@files=$$(git ls-files -z --cached --others --exclude-standard \
		| xargs -0 grep -IlsP '[^\x00-\x7F]'); \
	if [ -n "$$files" ]; then \
		echo "$$files" | xargs grep -nP '[^\x00-\x7F]'; \
		echo "non-ASCII characters found"; exit 1; \
	fi

check-go-mod:
	@echo "==> go mod tidy"
	$(GO) mod tidy -diff

check-go-fmt: generate
	@echo "==> go format"
	mkdir -p "$(HOST_GOPATH)/pkg/mod" "$(HOST_CACHE)/go-build"
	$(GOLANGCI) fmt --diff

check-go-lint: generate
	@echo "==> go lint"
	mkdir -p "$(HOST_GOPATH)/pkg/mod" "$(HOST_CACHE)/go-build"
	$(GOLANGCI) run

check-go-test: generate
	@echo "==> go test (CGO_ENABLED=0)"
	CGO_ENABLED=0 $(GO) test -count=1 ./...
	@echo "==> go test (CGO_ENABLED=1)"
	CGO_ENABLED=1 $(GO) test -count=1 ./...

# generate (vite build) is the bundle check; tsc catches type errors vite skips.
check-ui: generate
	@echo "==> ui types"
	$(NPM) exec -- tsc --noEmit -p .
	@echo "==> ui lint"
	$(NPM) run lint
	@echo "==> ui format"
	$(NPM) exec -- prettier . --check

test: format-go generate
	CGO_ENABLED=0 go test ./...
	CGO_ENABLED=1 go test ./...

test-race: format-go generate
	go test -race ./... -v

test-verbose: format-go generate
	go test ./... -v

test-clean: format-go generate
	go clean -testcache

build-site:
	go build -ldflags "$(LDFLAGS)" -tags="$(TAGS)" -o $(SITE_DST) $(SITE_SRC)

build-site-windows:
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "$(LDFLAGS)" \
		-tags="$(TAGS)" \
		-o $(SITE_DST).exe \
		$(SITE_SRC)

# Local UI development: a SQLite database with sample data, the Go API, and
# the Vite dev server (hot reload) on http://127.0.0.1:5173. Log in as dev/dev.
# Both servers bind to 127.0.0.1 only; the dev password is not a secret.
# Run dev-api and dev-ui in two terminals. `rm -rf data/dev` resets the data.
DEV_DIR      := ./data/dev
DEV_DB       := $(DEV_DIR)/karopon.db
DEV_USER     := dev
DEV_DB_FLAGS := --database-vendor sqlite --database-conn $(DEV_DB)

.PHONY: dev-db dev-api dev-ui
dev-db: $(DEV_DB)

$(DEV_DB):
	mkdir -p $(DEV_DIR)
	$(GO) run $(SITE_SRC) db create-user $(DEV_DB_FLAGS) -u $(DEV_USER) -p $(DEV_USER)
	$(GO) run $(SITE_SRC) db create-sample-data $(DEV_DB_FLAGS) -u $(DEV_USER)

dev-api: generate dev-db
	LOG_LEVEL=debug SESSION_SECRET=dev $(GO) run $(SITE_SRC) run $(DEV_DB_FLAGS) --bind 127.0.0.1

dev-ui: $(UI)/node_modules
	$(DOCKER_RUN) --init --network host --name karopon-dev-ui -w /work/src/ui \
		$(NODE_IMAGE) npm exec -- vite --host 127.0.0.1 --port 5173 --strictPort

run: format generate
	LOG_LEVEL=debug SESSION_SECRET=secret go run $(SITE_SRC) run

docker-pg:
	docker run -d --name postgres-karopon -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres

docker-mount-android:
	docker run -it --rm \
		-v "$(PWD):/workspace" \
		-v "$(PWD)/.gradle:/root/.gradle" \
		-v "$(PWD)/.go-mod-cache:/opt/gopath/pkg/mod" \
		karopon-android-build bash

.PHONY: release
release:
	docker build -t karopon:build -f docker/Dockerfile.build docker
	docker run \
		--rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $$PWD:/work \
		-w /work \
		karopon:build \
		release --skip=validate --clean --snapshot


.PHONY: release-github
release-github:
	docker build -t karopon:build -f docker/Dockerfile.build docker
	docker run \
		--rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $$PWD:/work \
		-e GITHUB_TOKEN=$$GITHUB_TOKEN \
		-w /work \
		karopon:build \
		release --skip=validate --clean

