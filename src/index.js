import Hapi from 'hapi';

const port = process.env.PORT || 9001;
const origins = process.env.ORIGINS ? process.env.ORIGINS.split(',') : ['*'];

console.log('*******');
console.log(origins);
console.log('*******');

const isDev = process.env.NODE_ENV === 'development';

const serverConfig = {
	host: isDev ? 'localhost' : null,
	port,
	router: {stripTrailingSlash: true},
	routes: {
		cors: {
			origin: origins
		},
		validate: {
			failAction: async (request, h, err) => {
				if (process.env.ENV !== 'production') {
					console.error(err);
				}

				throw err;
			}
		}
	}
};

const Server = new Hapi.Server(serverConfig);

async function beginServer() {
	try {
		await Server.ext(require('./onPreAuth'));
		await Server.register([require('./health'), require('./v1/mail'), require('./v2/mail')]);

		console.log(`Server is running on port ${port}`);

		console.log(Server.info);

		await Server.start();
	} catch (err) {
		console.log(err);
	}
}

beginServer();

module.exports = Server;
