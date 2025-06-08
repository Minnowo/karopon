package user

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

var (
	errInvalidToken error = fmt.Errorf("token is invalid")
)

const TOKEN_BYTES int = 32

type AccessToken [TOKEN_BYTES]byte

func (a *AccessToken) New() {
	rand.Read(a[:])
}

func (a *AccessToken) FromString(s string) error {

	n, err := hex.Decode(a[:], []byte(s))

	if n != len(a) || err != nil {
		return errInvalidToken
	}

	return nil
}

func (a *AccessToken) String() string {
	return hex.EncodeToString(a[:])
}
