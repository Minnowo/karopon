
# Karopon

A food tracking application.

## Development

Backend is done using [Golang](https://go.dev/), frontend is using Typescript with [Preact](https://preactjs.com/), and [Postgres](https://www.postgresql.org/) as a database.

Install Golang, and NPM, (Make is not required but makes stuff easier).

### Setup

First you need to setup the Postgres database. I recommend using Docker / Podman:
```sh
# Using the Makefile
make docker-pg

# manually with docker 
docker run -d --name postgres-karopon -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres
```

Then you should configure you environment variables for the database connection.
Create a `.env` file like this:
```
DATABASE_CONN = "user=postgres password=postgres port=5432 host=localhost sslmode=disable"
DATABASE_VENDOR = "postgres"
```

If you have Make, you can run:
```sh
# download go / js libraries
make download-tools install-go install-js 

# build the ui / run the go main command
make run
```

If you don't have Make:
```sh
# build the UI
cd ./src/ui && npm install && npm run build && cd ../..

# run the main program
go run main.go run
```

### Creating Data / Users

You will need to create a user and probably want some sample data:
```sh
# create a user
go run main.go db create-user -u myuser -p mypassword

# create sample data for that user
go run main.go db create-sample-data -u myuser
```


