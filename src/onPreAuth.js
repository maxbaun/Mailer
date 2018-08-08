const Boom = require('boom');

module.exports = {
	type: 'onPreAuth',
	method: onPreAuth
};

function onPreAuth(request, h) {
	if (!request.info.cors.isOriginMatch) {
		console.error(JSON.stringify(request.headers, null, 4));
		throw Boom.unauthorized('The request does not match the set origins.');
	}

	return h.continue;
}
