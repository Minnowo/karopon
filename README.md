
# Karopon

Karopon is a food tracking application for managing nutrition, meals and calories.
It focuses on making data-driven dietary management simple and intuitive.

## Features

- Track meals, calories and macronutrients
- Graphs to see your stats
- Features for Type 1 Diabetics:
  - Insulin calculation ([see formula here](./src/ui/src/utils/insulin.ts))
  - Blood sugar entry
  - Net carbs

## Deployment

Right now Karopon only supports **PostgreSQL** as its database. (SQLite planned eventually)

We recommend using the [Docker Compose File](./compose.yml) for easy deployment.

Deployment using Docker compose will look something like:
```bash
# make a folder
mkdir karopon && cd karopon

# download the compose.yml file
wget https://github.com/Minnowo/karopon/raw/refs/heads/main/compose.yml

# create the containers
docker compose up -d
```

## Development

This section explains how to set up Karopon for local development.

### Prerequisites

- [Golang](https://go.dev/)
- [Node.js & npm](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Make](https://www.gnu.org/software/make/) (optional but recommended)

### Setting Up the Database

1. Create a container instance of PostgreSQL:
   ```sh
   docker run -d \
       --name postgres-karopon \
       -p 5432:5432 \
       -e POSTGRES_PASSWORD=postgres \
       postgres
   ```
2. Edit the [.env file](./.env) with your database connection information. 
   The default .env file is already configured for the above docker command, so if you're using that exactly you shouldn't need to change anything.

### Setting Everything Else

1. Make sure you're in the root folder of the repo

2. One-time installs
   ```sh
   # download go / js libraries
   make download-tools install-go install-js 
   ```

3. Creating sample data and users:
   ```sh
   # create a user
   go run main.go db create-user -u myuser -p mypassword
   
   # create sample data for that user
   go run main.go db create-sample-data -u myuser
   ```

4. Build and run the UI and backend:
   ```sh
   make run
   ```

5. Optional (recommended), use the `--fake-auth-as-user yourUser` flag so you don't need to login.
   You can edit the [Makefile](./Makefile) and add this after the run command:
   ```Makefile
   run: format generate
        LOG_LEVEL=debug go run $(SITE_SRC) run --fake-auth-as-user minno
   ```

**NOTE**: Before you can run the backend, you MUST build the UI at least once, or ensure that `./src/ui/dist/static/main.js` and `./src/ui/dist/static/main.css` both exist.

