BIN := ./node_modules/.bin

migrate:
	@$(BIN)/sequelize db:migrate --config ./config/db.js -m

migrate-production:
	@$(BIN)/sequelize db:migrate --config ./config/db.js -m --env production

migrate-rollback:
	@$(BIN)/sequelize db:migrate:undo --config ./config/db.js -m -u

migration:
	@$(BIN)/sequelize migration:create --config ./config/db.js --name ${NAME}
