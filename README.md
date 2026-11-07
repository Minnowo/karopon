
# Karopon

A personal tracking application for health, nutrition, fitness, and everyday life.

Track meals, calories, nutrients, workouts, time, and custom health metrics.
Includes tools for diabetes management, including blood sugar tracking and insulin calculations.

Build charts, monitor progress, set goals, and create reminders.

## Features

- Track meals, calories, and nutrients down to the gram
- Track blood sugar, calculate and log insulin doses
- Tag-based time tracking
- Build Tabata workouts; track reps, time, weight, and distance
- Track weight, body fat, blood pressure, and custom metrics
- Set reminders for habits, breaks, and daily tasks
- Build charts, track progress, and set goals
- Export your data to TXT, JSON, or CSV

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

