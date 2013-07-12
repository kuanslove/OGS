
var express = require('express')
  , fs = require('fs')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var https = require('https');
var options = {
	key:fs.readFileSync('./ca-key.pem'),
	cert:fs.readFileSync('./ca-cert.pem')
};

var pg = require('pg');
var constring = "posgres://kuan:123@localhost:5432/kuan";

var app = express();

function set_env(){
	// all environments
	app.set('http_port', process.env.PORT || 80);
	app.set('https_port', process.env.PORT || 443);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('you can never crack this secret key, can you?'));
	app.use(express.session({ cookie:{ maxAge:600000} }));
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
};
set_env();

//some utility functions below

//[1]. qt is used for adding single quote to a string for SQL query string building
function qt(keyword){
	return "'"+keyword.trim()+"'";
};


app.get('/', routes.index);
app.get('/init', routes.find_admin);
app.post('/s_category/',function(req,res){
	pg.connect(constring, function(err, client, done){
		if(err){
			done();
			return console.error('Error to connect. ', err);
		}
		else {
			var qstring="select * from category where n_a=false";
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
});
app.post('/auth/', function(req, res){
	pg.connect(constring, function(err, client, done){
		if(err){
			done();
			return console.error('Error to connect. ', err);
		}
		else {
				var qstring="select * from users where n_a=false and admn=true and email=$1 and pswd=$2";
				client.query(qstring, ["'"+req.body['email']+"'", "'"+req.body['passwd']+"'"], function(err, result){
					done();
					if(err){
						return console.error('Error to fetch data. ', err);
					}
					else {
						if(result==[]){
							res.json({'authed':false, 'user_id':0});
						}
						else {
							res.json({'authed':true, 'user_id':result.rows[0].id});
						}
					}
				});
		}
	});
})

app.post('/login/', function(req, res){
	pg.connect(constring, function(err, client, done){
		if(err){
			done();
			return console.error('Error to connect. ', err);
		}
		else {
			var qstring="select * from users where n_a=false and email=$1 and pswd=md5($2)";
			console.log(req.body.email,req.body.passwd);
			client.query(qstring, [req.body.email,req.body.passwd],function(err, result){
				done();
				if(err){
					return console.error('Error to fetch data. ', err);
				}
				else {
					console.log(result.rows);
					if(result.rows.length!=0){
						res.json({'authed':true, 'user_id':result.rows[0].id});
					}
					else {
						res.json({'authed':false, 'user_id':0});
					}
					
				}
			});
		}
	});
});




// this part just for running server
function start_server(){
	http.createServer(app).listen(app.get('http_port'), function(){
	  console.log('Express server listening on port ' + app.get('http_port'));
	});
	https.createServer(options,app).listen(app.get('https_port'), function(){
	  console.log('Express server listening on port ' + app.get('https_port'));
	});
};
start_server();

