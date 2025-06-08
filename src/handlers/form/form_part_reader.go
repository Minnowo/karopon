package form

import (
	"io"
	"mime/multipart"
	"strconv"

	"github.com/rs/zerolog/log"
)

// read a string of at most the given length from the [multipart.Part]
// if it reads a string longer than length or reads an error it returns false
func ReadFormString(length int, part *multipart.Part) (string, bool) {

	var buf []byte = make([]byte, length+1)

	n, err := part.Read(buf[:])

	log.Debug().Bytes("buf", buf[0:n]).Int("n", n).Err(err).Msg("read string part")

	if n == 0 && err != nil {

		if err != io.EOF {
			return "", false
		}

		// allow empty string inputs
		return "", true
	}

	if n <= length {
		return string(buf[0:n]), true
	}

	return "", false
}

// reads a 32bit int from the [multipart.Part]
// if the part length has more digits than a 32bit integer or an invalid integer,
// it returns false, otherwise it returns the integer
func ReadFormInt(part *multipart.Part) (int32, bool) {

	// 10 digits is the max length of a int32
	const INT_MAX_CHAR_LEN int = 10

	// read 1 extra, if we get it, the sender is sending invalid data
	var buf [INT_MAX_CHAR_LEN + 1]byte

	n, _ := part.Read(buf[:])

	if 0 < n && n <= INT_MAX_CHAR_LEN {

		val, err := strconv.Atoi(string(buf[0:n]))

		if err == nil {
			return int32(val), true
		}
	}

	return 0, false
}
