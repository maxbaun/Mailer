import Joi from 'joi';
import Boom from 'boom';
import Twig from 'twig';
import {existsSync} from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import * as Aws from 'aws-sdk';
const {hasOwnProperty} = Object.prototype;

Aws.config.update({
	region: 'us-east-1',
	accessKeyId: process.env.AWS_ACCESSKEYID,
	secretAccessKey: process.env.AWS_SECRETACCESSKEY
});

exports.plugin = {register, name: 'v2mail'};

async function register(plugin) {
	await plugin.route([
		{
			path: '/v2/mail',
			method: 'POST',
			handler: sendMessage,
			config: {
				validate: {
					payload: Joi.object().keys({
						subject: Joi.string().required(),
						toName: Joi.string().required(),
						toEmail: Joi.string().required(),
						fromName: Joi.string().required(),
						fromEmail: Joi.string().required(),
						// Used in the footer
						website: Joi.string().required(),
						// If the Body paramater is supplied, the email will be sent out as an html message
						body: Joi.object(),
						// Provide the message parameter to send a basic text email message
						message: Joi.string(),
						template: Joi.string().required()
					})
				}
			}
		}
	]);
}

async function sendMessage(req) {
	let testAccount = await createTestAccount();
	let transporter = createTransporter(testAccount);

	let message = {
		from: `${req.payload.fromName} <${req.payload.fromEmail}`,
		to: `${req.payload.toName} <${req.payload.toEmail}>`,
		subject: req.payload.subject,
		html: await getHtmlMesage(req.payload)
	};

	return new Promise((resolve, reject) => {
		transporter.sendMail(message, (err, res) => {
			if (err) {
				console.log('There as an error sending the message');
				console.error(err);
				reject(new Boom(err.message, {...err}));
			}

			return resolve(nodemailer.getTestMessageUrl(res));
		});
	});
}

async function createTestAccount() {
	return new Promise((resolve, reject) => {
		nodemailer.createTestAccount((err, account) => {
			if (err) {
				return reject(err);
			}

			return resolve(account);
		});
	});
}

function createTransporter(account) {
	return nodemailer.createTransport({
		host: account.smtp.host,
		port: account.smtp.port,
		secure: account.smtp.secure,
		auth: {
			user: account.user,
			pass: account.pass
		}
	});
}

async function getHtmlMesage(payload) {
	const template = getTemplate(payload.template);

	return new Promise((resolve, reject) => {
		Twig.renderFile(
			template,
			{
				...payload,
				body: getBodyParamsArray(payload.body)
			},
			(err, html) => {
				if (err) {
					console.log('Error rendering twig temlate');
					console.error(err);
					return reject(err);
				}

				return resolve(html);
			}
		);
	});
}

function getTemplate(template) {
	const filePath = path.resolve(`./src/templates/${template}.twig`);

	if (!existsSync(filePath)) {
		throw Boom.notFound(`Template ${template} not found.`);
	}

	return filePath;
}

function getBodyParamsArray(body) {
	let str = [];

	if (!body) {
		return str;
	}

	for (const key in body) {
		if (hasOwnProperty.call(body, key)) {
			const value = body[key];
			str.push(`${key}: <strong>${value}</strong>`);
		}
	}

	return str;
}
