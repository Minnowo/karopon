// Successful JSON responses. Error responses are problem details (problem.go).

package api

import (
	"encoding/json"
	"net/http"

	"github.com/minnowo/log4zero"
)

var logger = log4zero.Get("api-responses")

func WriteJSONObj(w http.ResponseWriter, obj any) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	err := json.NewEncoder(w).Encode(obj)

	if err != nil {
		logger.Debug().Err(err).Msg("error while writing json object response")
	}
}

func WriteJSONArr[T any](w http.ResponseWriter, arr []T) {

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	var err error

	if arr == nil {
		_, err = w.Write([]byte("[]"))
	} else {
		err = json.NewEncoder(w).Encode(arr)
	}

	if err != nil {
		logger.Debug().Err(err).Msg("error while writing json array response")
	}
}
