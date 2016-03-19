var fs = require('fs');
var Hapi = require('hapi');
var crypto = require('crypto');
var through = require('through2');
var mime = require('mime');

var server = new Hapi.Server();
server.connection({port: Number(process.argv[2] || 9000)});

server.route({
	method: 'POST',
	path: '/submit',
	config: {

		payload: {
			output: 'stream',
			parse: true,
			allow: 'multipart/form-data'
		},

		handler: function (request, reply) {
			var data = request.payload;

			var hash = crypto.createHash('md5');

			// Compute MD5 hash stream
			var computeMD5Hash = through(function (chunk, enc, cb) {
				hash.update(chunk, 'utf8');
				this.push(chunk);
				cb();
			});

			if (data.file) {
				var name = data.file.hapi.filename;
				var path = __dirname + "/uploads/" + crypto.randomBytes(16).toString('hex');
				var file = fs.createWriteStream(path);

				file.on('error', function (err) { 
					console.error(err) 
				});

				// Compute MD5 hash of file as it goes to the upload directory
				data.file.pipe(computeMD5Hash).pipe(file);

				data.file.on('end', function (err) {
					var ret = {
						md5hash: hash.digest('hex'),
						filepath: path,
						mimetype: mime.lookup(data.file.hapi.filename),
						filename: data.file.hapi.filename
					}
					reply(JSON.stringify(ret, null, 2));
				});
			}
		}
	}
});

server.start(function () {
	console.log('info', 'Server running at: ' + server.info.uri);
});