const { startWorker } = require('./src/worker');

startWorker().catch((error) => {
	console.error(error);
	process.exit(1);
});
