import Joi from 'joi';
import Boom from 'boom';
import Twig from 'twig';
import {existsSync, readFileSync} from 'fs';
import path from 'path';
import * as Aws from 'aws-sdk';
const {hasOwnProperty} = Object.prototype;

Aws.config.update({
	region: 'us-east-1'
});

exports.plugin = {register, name: 'mail'};

async function register(plugin) {
	await plugin.route([
		{
			path: '/v1/mail',
			method: 'POST',
			handler: sendMessage,
			config: {
				validate: {
					payload: Joi.object().keys({
						replyTo: Joi.string().required(),
						subject: Joi.string().required(),
						email: Joi.string().required(),
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
	let params = await getEmailParams(req);
	let res;

	try {
		res = await new Aws.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();
	} catch (err) {
		console.log('There as an error sending the message');
		console.error(err);
		throw new Boom(err.message, {...err});
	}

	return res;
}

async function getEmailParams(req) {
	const params = {
		Destination: {
			ToAddresses: [req.payload.email]
		},
		Source: 'max@d3applications.com',
		ReplyToAddresses: [req.payload.replyTo],
		Message: {
			Body: {},
			Subject: {
				Charset: 'UTF-8',
				Data: req.payload.subject
			}
		}
	};

	if (req.payload.body) {
		params.Message.Body.Html = {
			Charset: 'UTF-8',
			Data: await getHtmlMesage(req.payload)
		};
	} else if (req.payload.message) {
		params.Message.Body.Text = {
			Charset: 'UTF-8',
			Data: req.payload.message
		};
	}

	return params;
}

async function getHtmlMesage(payload) {
	const template = getTemplate(payload.template);

	console.log(template);

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

function getUtfMessage(body) {}
