var Sequelize = require('sequelize'),
dbConfig = require('../config/db')[process.env.NODE_ENV];

var sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: '127.0.0.1',
    port: 5432,
    dialect: 'postgres'
  }
);

var db = {
  Sequelize: Sequelize,
  sequelize: sequelize
};

db['User'] = db.sequelize.import(__dirname + '/user');

module.exports = db;
