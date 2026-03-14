package v1

import (
	"io"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) createUserEventLogPhoto(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

	err := r.ParseMultipartForm(10 << 20)

	if err != nil {
		api.BadReq(w, "file too large")
		return
	}

	file, header, err := r.FormFile("photo")

	if err != nil {
		api.BadReq(w, "missing file")
		return
	}

	defer file.Close()

	data, err := io.ReadAll(file)

	if err != nil {
		api.ServerErr(w, "failed to read file")
		return
	}

	mimeType := header.Header.Get("Content-Type")

	log.Info().Int("bytes", len(data)).Str("mime", mimeType).Msg("got photo")

	// api.WriteJSONObj(w, eventlogwithfoodlog)
}
