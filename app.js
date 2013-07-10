
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var pg = require('pg');
var constring = "posgres://kuan:24093072@localhost:5432/kuan";

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/init', function(req,res){
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
})

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

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
