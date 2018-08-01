exports.plugin = {register, name: 'health'};

async function register(plugin) {
	await plugin.route([
		{
			path: '/health',
			method: 'get',
			handler: () => {
				return {
					success: true
				};
			}
		}
	]);
}
