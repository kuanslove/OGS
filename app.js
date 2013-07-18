
var express = require('express')
  , fs = require('fs')
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
	app.set('http_port', process.env.PORT || 3000);
	app.set('https_port', process.env.PORT || 443);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('you can never crack this secret key, can you?'));
	app.use(express.session());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
};
set_env();

function check_https(req, res){
	if(req.protocol=='https') {
		return true;
	}
	else {
		res.redirect("https://"+req.get('host').slice(0,-5)+req.url);
		//~ res.redirect("https://localhost"+req.url);
		return false;
	}
};


// First, we parse r to figure out SQL query string.
function build_product_sql(r){
	
	var sql="SELECT * FROM products WHERE n_a=false ";
	var holder_index;
	var params = [];
	
	if(r.keywd){
		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="AND (name LIKE ANY (array["+placeholder.join(",")+"]) ";

		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index+r.keywd.length));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="OR description LIKE ANY (array["+placeholder.join(",")+"])) ";
	}
	holder_index = 2*r.keywd.length+1;
		
	if(r.category_id){
		params.push(r.category_id);
		sql+="AND category_id=$"+(holder_index++)+" ";
	}
	
	sql+="ORDER BY date_rev ";
	
	if(r.result_num){
		params.push(r.result_num);
		sql+="LIMIT $"+(holder_index++)+" ";
	}
	
	if(r.offst){
		params.push(r.offst);
		sql+="OFFSET $"+(holder_index++)+" ";
	}
	
	//~ console.log({sql:sql, params:params});
	return {sql:sql, params:params};
	//~ return sql;
};

// this handler is just for test
app.get("/test/", function(req, res){
	console.log("https://"+req.get('host')+req.url);
		get_init_product(req, res,
									{
										keywd:['1','12','3'],
										category_id:2,
										result_num:6,
										offst:2
									}
		);
		
});

function get_init_product(req, res, r){
	
	var qq = build_product_sql(r);
	
	pg.connect(constring, function(err, client, done){
		if(err){
			done();
			return console.error('Error to connect. ', err);
		}
		else {
			var qstring=qq.sql;
			client.query(qstring, qq.params, function(err, result){
				done();
				if(err){
					console.log(err);
				}
				else {
					res.json(result);
				}
			});
		}
	});		
};

app.get('/user/', function(req,res){
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
					res.json(result);
				}
			});
		}
	});
});

app.get('/', function(req, res){
	
	
	
	if(check_https(req,res)){

		res.render('test', { title: 'Express' });
	}
});
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
app.post('/a_product/', function(req, res){
	if(check_https(req,res)) {
		pg.connect(constring, function(err, client, done){
			if(err){
				done();
				return console.error('Error to connect. ', err);
			}
			else {			
				
				var qstring="INSERT INTO products (name, description, price, user_id, \
				category_id, amnt, img) VALUES ($1,$2,$3,$4,$5,$6,$7)";
				var fm = req.body.product_info;
				var placeholder=[fm.name,fm.description,fm.price, req.session.user_id,
				fm.category,fm.amount,fm.img_data||'images/logo.png'];
				client.query(qstring, placeholder,function(err, result){
					done();
					if(err){
						console.log("insert failed");
						console.log(err);
						console.log(result);	
						res.json({suc:false,record:[]});
					}
					else {
						console.log('insert succeed');
						res.json({suc:true,record:result.rows});
					}
				});	
			}
		});
	}
});
app.post('/auth/', function(req, res){
	console.log("this is server session:"+req.session.user_id);
	console.log("this is cookie user_id:"+req.cookies.user_id);
	if(req.cookies.user_id && req.session.user_id){
		if(req.cookies.user_id==req.session.user_id){
			res.json( {
				authed:true,
				user_id:req.session.user_id,
				user_email:req.session.user_email,
				message:"Authed!"
				});
		}
		else {
			res.json( {
				authed:false,
				message:"Please login again."
				});
		}
	}
	else {
		res.json( {
			authed:false,
			message:"Please login again."
			});
	}
});
app.post('/login/', function(req, res){
	
	if(req.session.user_id){
		console.log("the user_id is in session.")
		req.session.user_id=undefined;
		res.clearCookie('user_id');
		res.json({'authed':false, 'user_id':undefined});
	}
	else {
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					return console.error('Error to connect. ', err);
				}
				else {
					var qstring="select * from users where n_a=false and email=$1 and pswd=md5($2)";
					client.query(qstring, [req.body.email,req.body.passwd],function(err, result){
						done();
						if(err){
							return console.error('Error to fetch data. ', err);
						}
						else {
							console.log(result.rows);
							if(result.rows.length!=0){
								res.cookie('user_id',result.rows[0].id, {maxAge:100000});
								req.session.user_id=result.rows[0].id;
								req.session.user_email=result.rows[0].email;
								res.json({'authed':true, 'user_name':result.rows[0].name});
							}
							else {
								req.session.user_id=undefined;
								req.session.user_email=undefined;
								res.clearCookie('user_id');
								res.json({'authed':false, 'user_id':undefined});
							}
							
						}
					});
				}
			});
	}

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


