package database

type Vendor int

const (
	UNKNOWN  Vendor = iota
	POSTGRES Vendor = iota
	SQLITE   Vendor = iota
)

func DBTypeFromStr(s string) Vendor {

	switch s {
	case "postgres":
		return POSTGRES
	case "sqlite":
		return SQLITE
	}

	return UNKNOWN
}
