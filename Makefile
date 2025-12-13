
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


download-tools:
	go install golang.org/x/tools/cmd/goimports@latest

install-go:
	go mod download

install-js:
	make -C $(UI) install

generate:
	make -C ./src/ui generate

format:
	gofmt -w -s .
	goimports -w .

test: format generate
	go test ./...

test-race: format generate
	go test -race ./... -v

test-verbose: format generate
	go test ./... -v

test-clean: format generate
	go clean -testcache

build-site:
	go build -ldflags "$(LDFLAGS)" -tags="$(TAGS)" -o $(SITE_DST) $(SITE_SRC)

build-site-windows:
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build \
		-ldflags "$(LDFLAGS)" \
		-tags="$(TAGS)" \
		-o $(SITE_DST).exe \
		$(SITE_SRC)

run: format generate
	LOG_LEVEL=debug go run $(SITE_SRC) run --fake-auth-as-user minno

docker-pg:
	docker run -d --name postgres-karopon -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres

.PHONY: release
release:
	docker build -t karopon:build -f docker/Dockerfile.build docker
	docker run \
		--rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $$PWD:/work \
		-w /work \
		karopon:build \
		release --skip-validate --clean --snapshot


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
		release --skip-validate --clean

