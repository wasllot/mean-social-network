'use strict' 

var mongoose = require('mongoose'); 
var app = require('./app'); 
var port = 3800; 

/* Conexión DataBase */
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/curso_mean_social') 
		.then(() => {  
			console.log("Database connection established correctly");

		
			app.listen(port, () => {
				console.log("Server running on " + String(port));
			});

		})
		.catch(err => console.log(err));  
