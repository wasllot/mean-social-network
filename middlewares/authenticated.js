'use strict'

var jwt = require('jwt-simple');
var moment = require('moment');

var secret = 'esta_es_mi_clave_secreta_de_mi_curso_de_red_social'; 

exports.ensureAuth = function(req, res, next){
	if(!req.headers.authorization){
		return res.status(403).send({message: 'La petición no tiene la cabecera de autenticación!!!'});
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
