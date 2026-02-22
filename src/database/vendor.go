package database

type Vendor int

const (
	DB_VENDOR_UNKNOWN  Vendor = iota
	DB_VENDOR_POSTGRES Vendor = iota
	DB_VENDOR_SQLITE   Vendor = iota
)

func DBVendorList() string {
	return "[postgres, sqlite]"
}

func DBTypeFromStr(s string) Vendor {

	switch s {
	case "postgres":
		return DB_VENDOR_POSTGRES
	case "sqlite":
		return DB_VENDOR_SQLITE
	}

	return DB_VENDOR_UNKNOWN
}
