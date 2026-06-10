package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/api/userreg"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

type sessionResponse struct {
	Created   database.TimeMillis `json:"created"`
	Expires   database.TimeMillis `json:"expires"`
	UserAgent string              `json:"user_agent"`
	TokenID   string              `json:"token_id"`
	IsCurrent bool                `json:"is_current"`
}

func (a *APIV1) getUserSessions(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	var sessions []database.TblUserSession

	if err := a.Db.LoadUserSessions(r.Context(), user.ID, &sessions); err != nil {

		log.Error().Err(err).Int("userID", user.ID).Msg("failed to load user sessions")
		api.ServerErr(w, "failed to load sessions")

		return
	}

	var currentHashHex string

	if tokenStr := auth.GetToken(r); tokenStr != "" {
		var token userreg.AccessToken
		if err := token.FromString(tokenStr); err == nil {
			currentHashHex = token.HashString()
		}
	}

	result := make([]sessionResponse, 0, len(sessions))

	for _, s := range sessions {

		token := userreg.AccessTokenHash(s.Token)
		tokenStr := token.String()

		result = append(result, sessionResponse{
			Created:   s.Created,
			Expires:   s.Expires,
			UserAgent: s.UserAgent,
			TokenID:   tokenStr,
			IsCurrent: currentHashHex != "" && tokenStr == currentHashHex,
		})
	}

	api.WriteJSONArr(w, result)
}
