package database

type Vendor int

const (
	POSTGRES Vendor = iota
)

func DBTypeFromStr(s string) Vendor {

	switch s {
	case "postgres":
		return POSTGRES
	}

	return POSTGRES
}
