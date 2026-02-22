package userreg

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

var (
	errInvalidToken error = errors.New("token is invalid")
)

const TOKEN_BYTES int = 32

type AccessToken [TOKEN_BYTES]byte
type AccessTokenHash [sha256.Size]byte

func (a *AccessToken) New() {
	rand.Read(a[:])
}

func (a *AccessToken) String() string {
	return hex.EncodeToString(a[:])
}

func (a *AccessToken) FromString(s string) error {

	n, err := hex.Decode(a[:], []byte(s))

	if err != nil || n != len(a) {
		return errInvalidToken
	}

	return nil
}

func (a *AccessToken) Hash() AccessTokenHash {

	sha := sha256.New()
	sha.Write(a[:])

	return AccessTokenHash(sha.Sum(nil))
}

func (a *AccessToken) HashString() string {

	hash := a.Hash()

	return hex.EncodeToString(hash[:])
}
func (a *AccessToken) HashBytes() []byte {

	hash := a.Hash()

	return hash[:]
}
