import express from 'express';
import router from './router.js';

export default class {
	router = express.Router();

	/**
	 * Конструктор Вашего плагина
	 * @param {string} plugin_name Название Вашего плагина, которое Вы указали в const.json
	 * @param {mongoose.Connection} database Соединение с базой данных Вашего плагина
	 */
	constructor(plugin_name, database) {
		this.router.all('*', router);
		console.log(`Plug-in ${plugin_name} started`);
	}
	
	router_all (req, res) {
		console.log('Hello world');
		res.send('ok');
		// your code here
	}
}