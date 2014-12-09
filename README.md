## Environment Configuration
In order to configure the environment, create a `.env` file that contains values for the following environment variables.

```
DB_HOST
DB_USERNAME
DB_PASSWORD
DB_DEVELOPMENT
NODE_ENV
```

The value for `DB_HOST` for a local database should be `127.0.0.1`.

## DB Setup
Assuming Postgres is installed, run the following commands for development use.

```
createuser -e <db_user>
createdb -e <db_name> -O <db_user>
```

Where `<db_user>` and `<db_name>` are the values associated with `DB_USERNAME` and `DB_DEVELOPMENT` in your `.env` file, respectively.

Optionally, use the flag `-P` on the `createuser` command to be prompted to set a password for the new user, and add it to `DB_PASSWORD` in your `.env` file.

Once, the database has been created, run `make migrate` to create the necessary tables.
