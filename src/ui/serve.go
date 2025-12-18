package ui

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

//go:embed dist
var assets embed.FS

var mainJsPath = "dist/static/main.js"
var mainJsHash []byte

var mainCssPath = "dist/static/main.css"
var mainCssHash []byte

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
		f.Close()
		strHash := hex.EncodeToString(h.Sum(nil))
		return []byte(strHash)[0:8]
	}
	mainJsHash = getHash(mainJsPath)
	mainCssHash = getHash(mainCssPath)
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write([]byte(
		`<!doctype html><html lang="en"><head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <title>Karopon</title>
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />`))

	// Invalidate the cache of these if the server restarts
	{
		w.Write([]byte(`<link rel="stylesheet" crossorigin href="/static/main.css?v=`))
		w.Write(mainCssHash)
		w.Write([]byte(`" />`))

		w.Write([]byte(`<script type="module" crossorigin src="/static/main.js?v=`))
		w.Write(mainJsHash)
		w.Write([]byte(`"></script>`))
	}

	w.Write([]byte(`</head> <body id="app"> </body> </html>`))
}

// Register registers the ui on the root path.
func Register(r *mux.Router) {

	r.Handle("/static/main.js", serveFile(mainJsPath, "text/javascript"))
	r.Handle("/static/main.css", serveFile(mainCssPath, "text/css"))

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
