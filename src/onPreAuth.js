const Boom = require('boom');

module.exports = {
	type: 'onPreAuth',
	method: onPreAuth
};

function onPreAuth(request, h) {
	if (!request.info.cors.isOriginMatch) {
		console.log(JSON.stringify(request.headers));
		throw Boom.unauthorized('The request does not match the set origins.');
	}

	return h.continue;
}
