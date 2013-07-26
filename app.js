
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

	app.use(express.static(path.join(__dirname, 'public')));
	//~ app.use(function(req, res, next){
		//~ var dt=new Date();
		//~ if((dt.getHours()<24)&&(dt.getHours()>6)){
			//~ // if it is shop hour: 6AM~12AM, we allow user to visit shop.
			//~ next();
		//~ }
		//~ else {
			//~ if(req.url!="/never/"){
				//~ res.render("btn");
			//~ }
			//~ else {
				//~ next();
			//~ }
		//~ }
	//~ });
	app.use(app.router);

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



function build_category_sql(r){
	
};

function build_user_sql(r){
		
	// the r passed in should be like
	/*
									{
										keywd:['1','12','3'],
										result_num:6,
										offst:5
									}
	the built string should look like:
	* 
	WITH p AS (
			SELECT *
			FROM products
			WHERE 
			email ILIKE ANY (ARRAY['%1%','%this%']) 
			)
	SELECT  *,
			(select count(*) from p) as total
	FROM p
	ORDER BY date_rev 
	LIMIT 5;

	*/
	
	
	
	//~ var sql="SELECT FROM products WHERE n_a=false ";
	var sql="WITH p AS ( SELECT * FROM users  ";
	var holder_index=1;
	var params = [];
	

	if(r.keywd){
		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="WHERE (email ILIKE ANY (array["+placeholder.join(",")+"]) ";
		
		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index+r.keywd.length));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="OR name ILIKE ANY (array["+placeholder.join(",")+"])) ";
		holder_index = 2*r.keywd.length+1;
	}
	
	sql+=") ";
	sql+="SELECT *, (SELECT count(*) FROM p) as total FROM p ";
	
	
	//sql+="ORDER BY date_rev DESC ";
	
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
	* 
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
	
	if(r.keywd){
		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="AND (name ILIKE ANY (array["+placeholder.join(",")+"]) ";

		var placeholder = [];
		for(holder_index=1; holder_index<=r.keywd.length; holder_index++){
			placeholder.push('$'+(holder_index+r.keywd.length));
			params.push('%'+r.keywd[holder_index-1]+'%');
		}
		sql+="OR description ILIKE ANY (array["+placeholder.join(",")+"])) ";
		holder_index = 2*r.keywd.length+1;
	}

	
		
	if(r.category_id){
		params.push(r.category_id);
		sql+="AND category_id=$"+(holder_index++)+" ";
	}
	
	sql+=") ";
	sql+="SELECT *, (SELECT count(*) FROM p) as total FROM p ";
	
	
	sql+="ORDER BY date_rev DESC ";
	
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
function build_my_product_sql(r){
	
	// the r passed in should be like
	/*
									{
										result_num:6,
										offst:2
									}
	the built string should look like:
	* 
	WITH p AS (
			SELECT *
			FROM products
			WHERE 
			user_id=XX
			)
	SELECT  *,
			(select count(*) from p) as total
	FROM p
	ORDER BY date_rev 
	LIMIT 5;

	*/
	var sql="WITH p AS ( SELECT * FROM products WHERE n_a=false ";
	var holder_index=1;
	var params = [];


	if(r.user_id){
		params.push(r.user_id);
		sql+="AND user_id=$"+(holder_index++)+" ";
	}
	
	
	sql+=") ";
	sql+="SELECT *, (SELECT count(*) FROM p) as total FROM p ";
	
	
	sql+="ORDER BY date_rev DESC ";
	
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
function is_authed(req, res){
	console.log("the auth user_id is:", req.cookies.user_id);
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

function is_admin_authed(req, res){
	console.log("the auth admin user_id is:", req.cookies.user_id);
	if(req.session.user_id && req.cookies.user_id && req.session.admn){
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


// This get_product function(down below) can be use query any thing rather than product.
// So, we use it globally.
// the return JSON loks like:
//						{
//							total_num:r_num,
//							page_list:result.rows
//						}
function get_product(req, res, r){
	// we move this function outside, so we can use this for both common
	// product request and my product request
	//~ var qq = build_my_product_sql(r);
	var qq = r;
	console.log(qq.sql);
	pg.connect(constring, function(err, client, done){
		if(err){
				done();
				
				res.send(501, 'Sorry, server is busy playing XBOX right now!');
		}
		else {
			var qstring=qq.sql;
			client.query(qstring, qq.params, function(err, result){
				done();
				if(err){
					// err could be "table not exists"!
					console.log(err);
					res.send(404, 'Sorry, query is sleeping!');
				}
				else {
					var r_num=0;
					if(result.rowCount==0){
						r_num=0;
					}
					else {
						r_num=result.rows[0].total;
					}
					console.log(result.rows);
					res.json(
						{
							total_num:r_num,
							page_list:result.rows
						});
				}
			});
		}
	});		
};
function clone(a) {
   return JSON.parse(JSON.stringify(a));
}




// never use this, replaced by get_product()
function get_product_not_used(req, res, r){
	var qq = build_product_sql(r);
	console.log(qq.sql);
	pg.connect(constring, function(err, client, done){
		if(err){
				done();
				res.send(501, 'Sorry, server is busy playing XBOX right now!');
		}
		else {
			var qstring=qq.sql;
			client.query(qstring, qq.params, function(err, result){
				done();
				if(err){
					res.send(404, 'Sorry, query is sleeping!');
				}
				else {
					var r_num=0;
					if(result.rowCount==0){
						r_num=0;
					}
					else {
						r_num=result.rows[0].total;
					}
					res.json(
						{
							total_num:r_num,
							page_list:result.rows
						});
				}
			});
		}
	});		
};
// this handler is just for test the query
app.get("/test/", function(req, res){
	console.log("https://"+req.get('host')+req.url);
		get_product(req, res,
								{
									keywd:['1','@12','@this'],
									category_id:2,
									result_num:3,
									offst:0
								}
		);
		
});



app.post('/s_user/admin/', function(req,res){
	if(check_https(req,res)) {
		var r = clone(req.body);
		var qq = build_user_sql(r);
		
		if( is_authed(req, res) ){
			get_product(req, res, qq);
		}
		else {
			res.send(404, "User not authed to get product list.")
		}
	}

});


app.get('/', function(req, res){
	if(check_https(req,res)){
		
		res.render('index', { title: 'Express' });
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
		if(is_authed(req, res)){
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
		else {
			res.send(404, 'User not authed to add new product!');
		}

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

app.post('/auth/admin/', function(req, res){
	if( check_https(req, res) ){
		// is_authed check if req.session.user_id exists 
		// and match the one passed from client
		if( is_admin_authed(req, res) ){
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
			// this case is for logout button click
			req.session.user_id=undefined;
			res.clearCookie('user_id');
			//~ res.json({'login':false, 'user_id':undefined});
			res.render("index");
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
					client.query(qstring, [req.body.email,req.body.email+req.body.passwd],function(err, result){
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
								if(result.rows[0].admn){
									console.log("this is a administrator.")
									req.session.admn=true;
								}
								else {
									req.session.admn=false;
								}
								res.json({'login':true, 'user_email':result.rows[0].email});
							}
							else {
					// user email passwd not matched.
								req.session.user_id=undefined;
								req.session.user_email=undefined;
								req.session.admn=false;
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
app.post('/login/admin/', function(req, res){
	if( check_https(req, res) ){
		if( is_authed(req, res) ){
			// if authed, then logout the user
			req.session.user_id=undefined;
			res.clearCookie('user_id');
			//~ res.json({'login':false, 'user_id':undefined});
			res.render("index");
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
					var qstring="select * from users where n_a=false and admn=true and email=$1 and pswd=md5($2)";
					client.query(qstring, [req.body.email,req.body.email+req.body.passwd],function(err, result){
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
								req.session.admn=true;
								res.json({'login':true, 'user_email':result.rows[0].email});
							}
							else {
					// user email passwd not matched.
								req.session.user_id=undefined;
								req.session.user_email=undefined;
								req.session.admn=false;
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
app.post("/d_product/", function(req, res){
	if(check_https(req,res)) {
		if(is_authed(req, res)){
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {			
					
					var qstring="UPDATE products SET n_a = true WHERE user_id=$1 AND id=$2";
					var placeholder=[req.cookies.user_id, req.body.product_id];
					client.query(qstring, placeholder,function(err, result){
						done();
						if(err){
							res.send(404, 'Sorry, deleting is sleeping!');
							//~ res.json({suc:false,record:[]});
						}
						else {
							if(result.rowCount>0){
								console.log('Delete succeed');
								res.json({suc:true,record:result.rows});
							}
							else {
								console.log('No Deleting');
								res.json({suc:false,record:result.rows});
							}
						}
					});	
				}
			});
		}
		else {
			res.send(404, 'User not authed to add new product!');
		}

	}
});
app.post("/s_my_product/", function(req, res){
	if( check_https(req, res) ){
		var r = clone(req.body);
		r['user_id']=req.cookies.user_id;
		console.log(req.cookies.user_id);
		var qq = build_my_product_sql(r);
		console.log("qq is:",qq);
		if( is_authed(req, res) ){
			get_product(req, res, qq);
		}
		else {
			res.send(404, "User not authed to get product list.")
		}
	}
});
app.post("/s_product/", function(req, res){
	
	if( check_https(req, res) ){
		var qq = build_product_sql(req.body);
		console.log(req.body);
		get_product(req, res, qq);
	}
});
app.post("/u_product/", function(req, res){
	if(check_https(req,res)) {
		if(is_authed(req, res)){
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {			
					
					var qstring="UPDATE products SET (name, description, price, \
					category_id, amnt, date_rev) = ($1,$2,$3,$4,$5,now()) WHERE user_id=$6 AND id=$7";
					var fm = req.body;
					var placeholder=[fm.name,fm.description,fm.price,
					fm.category,fm.amount,req.cookies.user_id, fm.product_id];
					client.query(qstring, placeholder,function(err, result){
						done();
						if(err){
							console.log(err);
							res.send(404, 'Sorry, updating is sleeping!');
							//~ res.json({suc:false,record:[]});
						}
						else {
							if(result.rowCount>0){
								console.log('Updating succeed');
								res.json({suc:true,record:result.rows});
							}
							else {
								console.log('No Updating');
								res.json({suc:false,record:result.rows});
							}
						}
					});	
				}
			});
		}
		else {
			res.send(404, 'User not authed to update new product!');
		}

	}
});
app.post("/u_pswd/",function(req, res){
	if(check_https(req,res)) {
		if(is_authed(req, res)){
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {
					console.log(req.session.user_email+req.body.new_pswd);
					var qstring="UPDATE users SET pswd=md5($1) where n_a=false and id=$2";
					client.query(qstring, [req.session.user_email+req.body.new_pswd,  req.cookies.user_id],function(err, result){
						if(err){
							res.send(404, 'Sorry, updating is sleeping!');
						}
						else {
							console.log(result);
							res.json({suc:true});
						}
					});
				}
			});
		}
		else {
			res.send(404, 'User not authed to change password.');
		}
	}	
});

app.post("/a_user/", function(req,res){
	if(check_https(req,res)) {
		if(is_authed(req, res)){
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {
					var qstring = "SELECT * from users WHERE email=$1";
					client.query(qstring, [req.body.email],function(err, result){
						if(err){
							console.log(err);
							res.send(404, 'Sorry, err happed during find dup email!');
						}
						else {
							console.log(result);
							if(result.rowCount==0){
								var qstring="INSERT INTO users (name, email, admn,n_a, pswd) VALUES ($1,$2, $3,$4,md5($5))";
								var b=req.body;
								var placeholder = [b.name, b.email,b.admn,b.n_a,b.email+'ogs'];
								client.query(qstring, placeholder,function(err, result){
									if(err){
										res.send(404, 'Sorry, adding is sleeping!');
									}
									else {
										res.json({suc:true});
									}
								});
							}
							else {
								res.send(404, 'Sorry, this email has already been registered!');
							}
							
						}
					});
				}
			});
		}
		else {
			res.send(404, 'User not authed to add.');
		}
	}
});
app.post("/u_user/", function(req, res){
	if(check_https(req,res)) {
		if(is_authed(req, res)){
			pg.connect(constring, function(err, client, done){
				if(err){
					done();
					res.send(501, 'Sorry, server is busy playing XBOX right now!');
				}
				else {
					var qstring="UPDATE users SET (admn,n_a)=($1,$2) WHERE id=$3";
					console.log(req.body.admn,req.body.n_a,req.body.user_id);
					client.query(qstring, [req.body.admn,req.body.n_a,req.body.user_id],function(err, result){
						if(err){
							console.log(err);
							res.send(404, 'Sorry, updating is sleeping!');
						}
						else {
							console.log(result);
							res.json({suc:true});
						}
					});
				}
			});
		}
		else {
			res.send(404, 'User not authed to update.');
		}
	}
});


app.get("/never/", function(req, res){
	if(check_https(req,res)) {
		req.session.user_id=undefined;
		req.session.admn=false;
		res.clearCookie('user_id');
		//~ res.json({'login':false, 'user_id':undefined});
		res.render('admin');
	}
});


//~ //The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
  res.render("btn");
});
app.post('*', function(req, res){
  res.render("btn");
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


