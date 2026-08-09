package ui

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

//go:embed dist
var assets embed.FS

var mainJsPath = "dist/static/main.js"
var mainCSSPath = "dist/static/main.css"
var manifestPath = "dist/manifest.json"
var icon192Path = "dist/icons/icon-192.png"
var icon512Path = "dist/icons/icon-512.png"
var appleTouchIconPath = "dist/icons/apple-touch-icon.png"
var faviconPath = "dist/icons/favicon.png"
var indexHTML []byte

func init() {
	getHash := func(path string) []byte {

		f, err := assets.Open(path)

		if err != nil {
			log.Panic().Err(err).Msgf("Error opening file: %s", path)
		}

		h := sha256.New()

		if _, err = io.Copy(h, f); err != nil {
			log.Panic().Err(err).Msgf("Error copying from file: %s", path)
		}

		if err := f.Close(); err != nil {
			log.Panic().Err(err).Msgf("Could not close file: %s", path)
		}
		strHash := hex.EncodeToString(h.Sum(nil))

		return []byte(strHash)[0:8]
	}

	var mainJsHash []byte = getHash(mainJsPath)
	var mainCSSHash []byte = getHash(mainCSSPath)
	var builder strings.Builder

	writeOrPanic := func(d []byte) {
		if n, err := builder.Write(d); err != nil {
			log.Panic().Err(err).Msg("could not write to indexHTML")
		} else if n != len(d) {
			log.Panic().Int("got", n).Int("wanted", len(d)).Msg("truncated write to indexHTML")
		}
	}
	writeOrPanic([]byte(
		`<!doctype html><html lang="en"><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#1b1b1b" />
        <title>Karopon</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icons/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`))

	// Invalidate the cache of these if the server restarts
	{
		writeOrPanic([]byte(`<link rel="stylesheet" crossorigin href="/static/main.css?v=`))
		writeOrPanic(mainCSSHash)
		writeOrPanic([]byte(`" />`))
	}

	{
		writeOrPanic([]byte(`<script type="module" crossorigin src="/static/main.js?v=`))
		writeOrPanic(mainJsHash)
		writeOrPanic([]byte(`"></script>`))
	}

	writeOrPanic([]byte(`</head> <body id="app"> </body> </html>`))

	indexHTML = []byte(builder.String())
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Header().Set("Cache-Control", "no-cache")
	if _, err := w.Write(indexHTML); err != nil {
		log.Debug().Err(err).Msg("failed to write indexHTML")
	}
}

// Register registers the ui on the root path.
func Register(r *mux.Router) {

	r.Handle("/static/main.js", serveFile(mainJsPath, "text/javascript"))
	r.Handle("/static/main.css", serveFile(mainCSSPath, "text/css"))
	r.Handle("/manifest.json", serveFile(manifestPath, "application/manifest+json"))
	r.Handle("/icons/icon-192.png", serveFile(icon192Path, "image/png"))
	r.Handle("/icons/icon-512.png", serveFile(icon512Path, "image/png"))
	r.Handle("/icons/apple-touch-icon.png", serveFile(appleTouchIconPath, "image/png"))
	r.Handle("/icons/favicon.png", serveFile(faviconPath, "image/png"))

	r.HandleFunc("/", serveIndex)
	r.HandleFunc("/index.html", serveIndex)
	r.HandleFunc("/home", serveIndex)

}

func serveFile(name, contentType string) http.HandlerFunc {
	file, err := assets.Open(name)
	if err != nil {
		log.Panic().Err(err).Msgf("could not find %s", file)
	}
	defer file.Close()
	content, err := io.ReadAll(file)
	if err != nil {
		log.Panic().Err(err).Msgf("could not read %s", file)
	}

	return func(writer http.ResponseWriter, reg *http.Request) {
		writer.Header().Set("Content-Type", contentType)
		writer.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		_, _ = writer.Write(content)
	}
}
