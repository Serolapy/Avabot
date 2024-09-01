import dotenv from 'dotenv';
dotenv.config();
import { FormData } from 'node-fetch';

import VkBot from 'node-vk-bot-api';
import Scene from 'node-vk-bot-api/lib/scene.js';
import Session from 'node-vk-bot-api/lib/session.js';
import Stage from 'node-vk-bot-api/lib/stage.js';
import Markup from 'node-vk-bot-api/lib/markup.js';

import Jimp from 'jimp';
import fetch from 'node-fetch';
import fs from 'node:fs';

import constants from './const.js';
const frames = Object.keys(constants.FRAMES);

// инициализируем бота
const bot = new VkBot({
	token: process.env.Avabot_token,
	confirmation: process.env.Avabot_confirmation
});

// алгоритм работы бота ("сцена")
const scene = new Scene('new_avatar',
	async (ctx) => {
		ctx.scene.next();
		ctx.reply('Начинаем создание аватарки. Выберите рамку', null, Markup.keyboard(frames, { columns: 3 }).oneTime());
	},
	async (ctx) => {
		let frames_message = ctx.message.text;
		
		let flag = false;
		
		for (let i = 0; i < frames.length; i++) {
			if (frames[i] == frames_message) {
				flag = true;
				break;
			}
		}
		if (!flag) {
			ctx.scene.step = 1;
			ctx.reply('Пожалуйста, воспользуйтесь кнопками. Выберите рамку', null, Markup.keyboard(frames, { columns: 3 }).oneTime());
			return
		}
		ctx.session.frames = frames_message;

		ctx.scene.next();
		ctx.reply('Рамка выбрана. Теперь пришлите Вашу фотографию в виде картинки');
	},
	async (ctx) => {
		if (ctx.message.attachments.length != 0){
			let attachment = ctx.message.attachments[0];
			if (attachment.type != 'photo') {
				ctx.scene.step = 2;
				ctx.reply('Пожалуйста, пришлите фотографию как картинку');
				return
			}
			let photo = attachment.photo.orig_photo;
			const temp_name = `./temp/photo${ctx.message.peer_id}.png`;

			// обработка картинки
			let photo_img = await Jimp.read({url: photo.url});
			
			// Обрезка и изменение размера изображения
			const w = photo_img.bitmap.width;
			const h = photo_img.bitmap.height;
			if (w > h) {
				photo_img = photo_img.crop((w-h)/2, 0, h, h);
			} else if (w < h) {
				photo_img = photo_img.crop(0, (h-w)/2, w, w);
			}
			photo_img = photo_img.resize(810, 810);

			// ставим фото на чистый лист
			let image = new Jimp(1080, 1080, "#FFFFFF");
			image = image.composite(photo_img, 135, 135);

			// Загрузка рамки
			const frame = await Jimp.read(`./plugins/Avabot/src/frames/${constants.FRAMES[ctx.session.frames]}`);


			// Наложение рамки на изображение
			const processedImage = image.composite(frame, 0, 0);
			processedImage.write(temp_name);

			const uploadServer = await bot.execute('docs.getMessagesUploadServer', { peer_id: ctx.message.peer_id, type: 'doc'});

			const formData = new FormData();
			formData.append('file', await fs.openAsBlob(temp_name), 'avatar.png');

			const response_upload_data = await fetch(uploadServer.upload_url, {
				method: 'POST',
				body: formData
			});

			const upload_data = await response_upload_data.json();

			const data = await bot.execute('docs.save', upload_data);
			ctx.reply('Вот Ваша аватарка!',`doc${data.doc.owner_id}_${data.doc.id}`);
			
			fs.rmSync(temp_name);

			ctx.scene.leave();

		}
		else {
			ctx.scene.step = 2;
			ctx.reply('Пожалуйста, пришлите фотографию как картинку');
			return
		}
	},
);

const session = new Session();
const stage = new Stage(scene);

bot.use(session.middleware());
bot.use(stage.middleware());

bot.command('/start', (ctx) => {
	const markup = Markup.keyboard([
		Markup.button({
			action: {
				type: 'text',
				label: 'Создать аватарку',
				payload: JSON.stringify({
					action: 'new_avatar'
				})
			}
		}),
	]);
	ctx.reply('Привет! Я бот для создания аватарок. Выберите действие:', null, markup.oneTime());
});

bot.on(async (ctx) => {
	const message = ctx.message;

	//если нажал на кнопку
	if (message['payload']){
		let payload = JSON.parse(message['payload']);

		switch(payload.action){
			case 'new_avatar':
				ctx.scene.enter('new_avatar');
				break;
		}
	}
	else{
		const markup = Markup.keyboard([
			Markup.button({
				action: {
					type: 'text',
					label: 'Создать аватарку',
					payload: JSON.stringify({
						action: 'new_avatar'
					})
				}
			}),
		]);
		ctx.reply('Выберите действие:', null, markup.oneTime());
	}
});

export default bot.webhookCallback;