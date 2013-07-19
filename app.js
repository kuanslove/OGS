
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
	app.set('https_port', process.env.PORT || 1443);
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
		res.redirect("https://"+req.get('host').slice(0,-5)+':'+app.get('https_port')+req.url);
		//~ res.redirect("https://localhost"+req.url);
		return false;
	}
};
// First, we parse r to figure out SQL query string for finding product.
function build_product_sql(r){
	
	// the r passed in should be like
	/*
									{
										keywd:['1','12','3'],
										category_id:2,
										result_num:6,
										offst:2
									}
	the built string should look like:
	
	WITH p AS (
			SELECT *
			FROM products
			WHERE 
			description LIKE ANY (ARRAY['%1%','%this%']) 
			OR 
			name LIKE ANY (ARRAY['%1%','%this%'])
			)
	SELECT  *,
			(select count(*) from p) as total
	FROM p
	ORDER BY date_rev 
	LIMIT 5;

	*/
	
	
	
	//~ var sql="SELECT FROM products WHERE n_a=false ";
	var sql="WITH p AS ( SELECT * FROM products WHERE n_a=false ";
	var holder_index=1;
	var params = [];
	
	
	console.log(undefined==r.keywd);
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
		holder_index = 2*r.keywd.length+1;
	}

	
		
	if(r.category_id){
		params.push(r.category_id);
		sql+="AND category_id=$"+(holder_index++)+" ";
	}
	
	sql+=") ";
	sql+="SELECT *, (SELECT count(*) FROM p) as total FROM p ";
	
	
	sql+="ORDER BY date_rev ";
	
	if(r.result_num){
		params.push(r.result_num);
		sql+="LIMIT $"+(holder_index++)+" ";
	}
	
	if(r.offst){
		params.push(r.offst);
		sql+="OFFSET $"+(holder_index++)+" ";
	}
	
	return {sql:sql, params:params};
};

//~ function build_

function is_authed(req, res){
	if(req.session.user_id && req.cookies.user_id){
		if(req.cookies.user_id==req.session.user_id){
			// user_id matched, authed!
			return true;
		}
		else {
			// fake user_id, denied!
			return false;
		}
	}
	else {
		// no user_id, denied!
		return false;
	}
};


function get_init_product(req, res, r){
	
	var qq = build_product_sql(r);
	console.log(qq.sql);
	//~ res.send(qq.sql);
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

// this handler is just for test the query
app.get("/test/", function(req, res){
	console.log("https://"+req.get('host')+req.url);
		get_init_product(req, res,
									{
										keywd:['1','12','3'],
										category_id:2,
										result_num:20,
										offst:0
									}
		);
		
});




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
	if(check_https(req,res)) {
		pg.connect(constring, function(err, client, done){
			if(err){
				done();
				res.send(501, 'Sorry, server is busy playing XBOX right now!');
			}
			else {
				var qstring="select * from category where n_a=false";
				client.query(qstring, function(err, result){
					done();
					if(err){
						res.send(400, 'Sorry, query is sleeping!');
					}
					else {
						res.json(result.rows);
					}
				});
			}
		});
	}
});
app.post('/a_product/', function(req, res){
	if(check_https(req,res)) {
		pg.connect(constring, function(err, client, done){
			if(err){
				done();
				res.send(501, 'Sorry, server is busy playing XBOX right now!');
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
						res.send(404, 'Sorry, insert is sleeping!');
						//~ res.json({suc:false,record:[]});
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
	if( check_https(req, res) ){
		// is_authed check if req.session.user_id exists 
		// and match the one passed from client
		if( is_authed(req, res) ){
			res.json( {
				authed:true,
				user_id:req.session.user_id,
				user_email:req.session.user_email,
				message:"You are Authed!"
				});
		}
		else {
			res.json( {
				authed:false,
				message:"You should Login!"
				});
		}
	}
});
app.post('/login/', function(req, res){
	if( check_https(req, res) ){
		if( is_authed(req, res) ){
			// if authed, then logout the user		
			console.log("the user_id is in session.")
			req.session.user_id=undefined;
			res.clearCookie('user_id');
			res.json({'login':false, 'user_id':undefined});
		}
		else {
			// if not authed, then we verify and login the user
			pg.connect(constring, function(err, client, done){
				if(err){
					// the server refuse to connect.
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {
					// the server accepts connect
					var qstring="select * from users where n_a=false and email=$1 and pswd=md5($2)";
					client.query(qstring, [req.body.email,req.body.passwd],function(err, result){
						done();
					// the server is good, but can not query.
						if(err){
							res.send(404, 'Sorry, query is sleeping!');
						}
						else {
					// successfully query
							console.log(result.rows);
							if(result.rows.length!=0){
								res.cookie('user_id',result.rows[0].id, {maxAge:2000000});
								req.session.user_id=result.rows[0].id;
								req.session.user_email=result.rows[0].email;
								res.json({'login':true, 'user_email':result.rows[0].email});
							}
							else {
					// user email passwd not matched.
								req.session.user_id=undefined;
								req.session.user_email=undefined;
								res.clearCookie('user_id');
								res.json({'login':false, 'user_id':undefined});
							}
						}
					});
				}
			});			
			
			
			
			
		}
		
	
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


