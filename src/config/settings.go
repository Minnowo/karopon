package config

var (
	fakeAuthUsername string = ""
)

func FakeAuth() bool {
	return fakeAuthUsername != ""
}
func SetFakeAuthUser(name string) {
	fakeAuthUsername = name
}
func FakeAuthUser() string { return fakeAuthUsername }
