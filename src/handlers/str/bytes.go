package str

import (
	"fmt"
	"math"
)

func PrettyByteSize(b int) string {
	return PrettyByteSize64(int64(b))
}

func PrettyByteSize64(b int64) string {
	bf := float64(b)
	for _, unit := range []string{"", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi"} {
		if math.Abs(bf) < 1024.0 {
			return fmt.Sprintf("%3.1f%sB (%d bytes)", bf, unit, b)
		}
		bf /= 1024.0
	}
	return fmt.Sprintf("%.1fYiB", bf)
}
