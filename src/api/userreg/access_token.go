package userreg

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

var (
	errInvalidToken error = errors.New("token is invalid")
)

const TokenNonceSize int = 16
const TokenHMACSize int = sha256.Size
const TokenByteSize int = TokenNonceSize + TokenHMACSize
const TokenHashByteSize int = sha256.Size

// AccessToken is a nonce concatenated with HMAC-SHA256(nonce, key).
type AccessToken [TokenByteSize]byte
type AccessTokenHash [TokenHashByteSize]byte

// New generates a new signed token using the provided HMAC key.
// The token consists of a random nonce followed by HMAC-SHA256(nonce, key).
func (a *AccessToken) New(key []byte) {
	rand.Read(a[:TokenNonceSize])
	mac := hmac.New(sha256.New, key)
	mac.Write(a[:TokenNonceSize])
	copy(a[TokenNonceSize:], mac.Sum(nil))
}

// Verify returns true if the token's HMAC is valid for the given key.
func (a *AccessToken) Verify(key []byte) bool {

	mac := hmac.New(sha256.New, key)
	mac.Write(a[:TokenNonceSize])
	expected := mac.Sum(nil)

	return hmac.Equal(a[TokenNonceSize:], expected)
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
	sha.Write(a[:TokenNonceSize])

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

func (h *AccessTokenHash) FromString(s string) error {

	n, err := hex.Decode(h[:], []byte(s))

	if err != nil || n != len(h) {
		return errInvalidToken
	}

	return nil
}

func (h *AccessTokenHash) String() string {
	return hex.EncodeToString(h[:])
}
