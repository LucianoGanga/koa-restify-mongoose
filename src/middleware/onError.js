module.exports = function*(err) {
	this.status = err.statusCode || 500;
	this.body = JSON.parse(JSON.stringify(err));

	throw err;
}
