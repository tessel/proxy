var dotenv = require('dotenv')
  , path = require('path')
  ; 

dotenv._getKeysAndValuesFromEnvFilePath(path.join(__dirname, '../', '.env'));
dotenv._setEnvs();

var host = process.env.DB_HOST || "127.0.0.1";

module.exports = {
  "development": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_DEVELOPMENT,
    "host": host,
    "dialect": "postgres"
  },
  "test": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_TEST,
    "host": host,
    "dialect": "postgres"
  },
  "production": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_PRODUCTION,
    "host": host,
    "dialect": "postgres"
  }
}
