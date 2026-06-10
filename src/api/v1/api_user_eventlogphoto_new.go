package v1

import (
	"io"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
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

	file, _, err := r.FormFile("photo")

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

	photo := database.TblUserPhoto{
		UserID: user.ID,
		Data:   data,
	}

	id, err := a.Db.AddUserPhoto(r.Context(), &photo)

	if err != nil {
		api.ServerErr(w, "failed to save photo")
		log.Error().Err(err).Int("userid", user.ID).Msg("failed to save photo")
		return
	}

	api.WriteJSONObj(w, struct {
		ID int `json:"id"`
	}{ID: id})
}
