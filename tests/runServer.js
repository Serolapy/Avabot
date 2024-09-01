import fs from 'fs';
import express from 'express';
import mongoose from 'mongoose';

const constants = {
	BOT_SERVER_PORT : 8443,							// порт сервера лаунчера
	DB_DOMAIN : "mongodb://localhost",				// домен базы данных
	DB_MONGO_PORT : 27017,							// порт базы данных
	DB_SERVER_PORT : 3900,							// порт для подключения к серверу базы данных

	PLUGIN_REQUIRED_FIELDS : [						// обязательные поля в конфиг-файле плагинов
		'plugin_name',								// название плагина
	]
}

const plugin_index_path = `index.js`;
if (!fs.existsSync(plugin_index_path)){
	throw Error(`Плагин не имеет файл index.js`);
}

const plugin_config_path = `config.json`;
if (!fs.existsSync(plugin_config_path)){
	throw Error(`Плагин в каталоге не имеет файл config.json`);
}

const config = JSON.parse(fs.readFileSync(plugin_config_path).toString());
constants.PLUGIN_REQUIRED_FIELDS.forEach(field => {
	if (config[field] === undefined){
		throw Error(`Конфиг-файл плагина не имеет поля ${field}`);
	}
});

const plugin_name = '' + config.plugin_name;
const plugin_class = await import(`../index.js`);
const database = mongoose.createConnection(`${constants.DB_DOMAIN}:${constants.DB_MONGO_PORT}/bots_launcher-test_plugin-${plugin_name}`, {family: 4});
const plugin = new plugin_class.default(plugin_name, database);

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(`/${plugin_name}`, plugin.router);
app.listen(constants.BOT_SERVER_PORT, function () {
	console.log(`[TEST PLUG-IN] Bots-launcher's server started. http://localhost:${constants.BOT_SERVER_PORT}/${plugin_name}`);
});