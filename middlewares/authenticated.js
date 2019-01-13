'use strict'

var jwt = require('jwt-simple');
var moment = require('moment');

var secret = 'put_a_secret_password_here'; 

exports.ensureAuth = function(req, res, next){
	if(!req.headers.authorization){
		return res.status(403).send({message: 'Missing authentication header'});
	}

	
	var token = req.headers.authorization.replace(/['"]+/g, ''); 

	// payload decode
	try{
		var payload = jwt.decode(token, secret);
		if(payload.exp <= moment().unix()){
			return res.status(401).send({message: 'Token has expired'});
		}
	}catch(ex){
		return res.status(404).send({message: 'Invalid token'});
	}


	req.user = payload;

	
	next();
}
