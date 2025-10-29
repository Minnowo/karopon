
VERSION := $(shell git describe --tags --abbrev=0)
COMMIT  := $(shell git rev-parse --verify HEAD)
DATE    := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

LDFLAGS := -s -w -linkmode external -extldflags -static
LDFLAGS += -X main.BuildMode=prod
LDFLAGS += -X main.BuildDate=$(DATE)
LDFLAGS += -X main.BuildCommit=$(COMMIT)
LDFLAGS += -X main.BuildVersion=$(VERSION)

TAGS    := netgo osusergo sqlite_omit_load_extension

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

run: format generate
	LOG_LEVEL=debug go run $(SITE_SRC) run

docker-pg:
	docker run -d --name postgres-karopon -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres

