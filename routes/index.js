var pg = require('pg');
var constring = "posgres://kuan:24093072@localhost:5432/kuan";


function check_https(req, res){
	if(req.secure) {
		return true;
	}
	else {
		res.redirect("https://localhost"+req.url);
		return false;
	}
}

exports.index = function(req, res){
	if(check_https(req,res)){
		console.log(req.protocol);
		res.render('index', { title: 'Express' });
	}
};

exports.find_admin = function(req,res){
	if(check_https(req,res)){
		pg.connect(constring, function(err, client, done){
			if(err){
				done();
				return console.error('Error to connect. ', err);
			}
			else {
				var qstring="select * from users";
				client.query(qstring, function(err, result){
					done();
					if(err){
						return console.error('Error to fetch data. ', err);
					}
					else {
						res.json(result.rows);
					}
				});
			}
			
		});
	}
};
