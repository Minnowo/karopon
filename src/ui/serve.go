package ui

import (
	"embed"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
)

//go:embed dist
var assets embed.FS

// Register registers the ui on the root path.
func Register(r *mux.Router) {

	r.Handle("/static/index.js", serveFile("dist/static/index.js", "text/javascript"))
	r.Handle("/static/index.css", serveFile("dist/static/index.css", "text/css"))

	indexHtml := serveFile("dist/index.html", "text/html")
	r.Handle("/", indexHtml)
	r.Handle("/index.html", indexHtml)
	r.Handle("/home", indexHtml)

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
		_, _ = writer.Write(content)
	}
}
