'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs'); 
var path = require('path');

var User = require('../models/user');
var Follow = require('../models/follow');
var Publication = require('../models/publication');
var jwt = require('../services/jwt'); // tokens



/*** Start method ***/
function home(req, res) {
	res.status(200).send({
		message: 'Hello world from nodeJS'
	});
}

/*** Test method ***/
function pruebas(req, res) {
	//console.log(req.body);
	res.status(200).send({
		message: 'Test action from nodejs'
	});
}

/*** Saving users method ***/
function saveUser(req, res){
		var params = req.body;
	var user = new User();

	if (params.name && params.surname && params.nick && params.email && params.password){
		user.name = params.name;
		user.surname = params.surname;
		user.nick = params.nick;
		user.email = params.email;
		user.role = 'ROLE_USER';
		user.image = null;
		user.status = null;

		// Checking duplicated users
		User.findOne({ $or: [{email: user.email.toLowerCase()},{nick: {$regex : new RegExp(user.nick, "i")}}]}).exec((err, users) => {
			if(err) return res.status(500).send({message: 'Error in the users request'});
			if(users && users.length >= 1){
				users.forEach((bad_user) =>{
					if ((bad_user.nick.toLowerCase() == user.nick.toLowerCase())&&(bad_user.email.toLowerCase() == user.email.toLowerCase())){
						return res.status(200).send({message: 'There are an user with nick '+user.nick+' and email '+user.email+' register in already'});
					}
					if (bad_user.nick.toLowerCase() == user.nick.toLowerCase()){
						return res.status(200).send({message: 'There are an user with nick '+user.nick+' register in already'});
					}
					if (bad_user.email.toLowerCase() == user.email.toLowerCase()){
						return res.status(200).send({message: 'There are an user with email '+user.email+' register in already'});
					}
				});
			} else {
				// Save encrypt password
				bcrypt.hash(params.password, null, null, (err, hash) => {
					user.password = hash;

					// save user
					user.save((err, userStore) => {
						if(err) return res.status(500).send({message: 'Error by saving user'});
						if(userStore){
							res.status(200).send({user: userStore});
						} else {
							res.status(404).send({message: 'The user has not registered'});
						}
					});
				});
			}
		});
	} else {
		res.status(200).send({message: 'Send all required fields'});
	}
}

/*** login method ***/
function loginUser(req, res){
	var params = req.body;

	var email = params.email;
	var password = params.password;

	User.findOne({email: email}, (err, user) => {
		if (err) return res.status(500).send({message: 'Error in the request'});
		if (user){
			bcrypt.compare(password, user.password, (err, check) => {
				if (check){
				if (params.gettoken){ // gettoken es un parametro (true/false) que si está a true indica que queremos el token
					// generar y devolver token
					return res.status(200).send({token: jwt.createToken(user)});
				} else {
					// devolver datos de usuario
					user.password = undefined;
					return res.status(200).send({user});
				}

			} else {
				return res.status(404).send({message: 'Wrong email or password '});
			}
		});
		} else {
			return res.status(404).send({message: 'Wrong email or password !!'});
		}
	});
}

/*** Method to get data from an user ***/
function getUser(req, res){
	var user_id = req.params.id;

	//Removing password
	User.findById(user_id, '-password', (err, user) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(!user) return res.status(404).send({message: 'user doesnt exist'});


		followThisUser(req.user.sub, user_id).then((value) => {
			return res.status(200).send({user, followed:value.followed, following:value.following});
		});
	});
}

/*** Method to get users list ***/
function getUsers(req, res){
	var identity_user_id = req.user.sub;

	var page = 1; 
	if (req.params.page){
		page = req.params.page;
	}

	var itemsPerPage = 9;
	User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(!users) return res.status(404).send({message: 'There are not available users'});

		followUserIds(identity_user_id).then((value) => {
			return res.status(200).send({
				users : users,	
				users_following : value.following,
				users_follow_me : value.followed,
				total : total,
				pages : Math.ceil(total/itemsPerPage)
			});
		});
	});
}

/*** Method to update user ***/
function updateUser(req, res){
	var user_id = req.params.id;
	var update = req.body;

	// Removing password property
	delete update.password;

	if(user_id != req.user.sub){
		return res.status(500).send({message: 'You are unavailable to update this user'});
	}

	User.findOne({nick: { $regex : new RegExp(update.nick, "i") }},(err, bad_user) => {
		if(err) return res.status(500).send({message: 'Error by checking nick'});
		if(bad_user){
			if(bad_user._id != user_id){
				return res.status(200).send({message: 'There are an user with nick '+bad_user.nick+' register in already'});
			}
		}
		
		User.findByIdAndUpdate(user_id, update, {new:true}, (err, userUpdated) => { // con new indicamos que userUpdated sea el usuario actualizado, sino de devuelve el original
			if(err) return res.status(500).send({message: 'Error in the request'});
			if(!userUpdated) return res.status(404).send({message: 'User has not updated'});

			return res.status(200).send({user: userUpdated});
		});
	});	
}

/*** Upload file method ***/
function uploadImage(req, res){
	var userId = req.params.id;

	if(req.files){ 
		//console.log(req.files);
		var file_path = req.files.image.path;
		//console.log(file_path);
		var file_split = file_path.split('\\'); 
		//console.log(file_split);

		var file_name = file_split[2];
		//console.log(file_name);

		var ext_split = file_name.split('\.');
		var file_ext = ext_split[1];
		//console.log(file_ext);

		if(userId != req.user.sub){
			return removeFilesUploads(res, file_path, 'You are unavailable to update the image');
		}

		if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
			//console.log('Extensión válida nos ponemos a trabajar...');
			User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated) => {
				if(err) return res.status(500).send({message: 'Error in the request'});
				if(!userUpdated) return res.status(404).send({message: 'User has not been updated'});

				return res.status(200).send({user: userUpdated});
			});

		} else {
			return removeFilesUploads(res, file_path, 'Invalid extension');
		}

	} else {
		return res.status(200).send({message: 'Files have not upload'});
	}
}

/*** Método para mostrar imagen del usuario ***/
function getImageFile(req, res){
	var image_file = req.params.imageFile;
	var path_file = './uploads/users/'+image_file;

	fs.exists(path_file, (exists) => {
		if(exists){
			res.sendFile(path.resolve(path_file));
		}else{
			res.status(200).send({message: 'Image doesnt exist'});
		}
	});
}

/*** Method to get counts or user id ***/
function getCounters(req, res){
	var user_id = req.user.sub;

	if(req.params.id){
		user_id = req.params.id;
	}

	getCountFollow(user_id).then((stats) => {
		return res.status(200).send(stats);
	});
}

module.exports = {
	home,
	pruebas,
	saveUser,
	loginUser, 
	getUser,
	getUsers,
	updateUser,
	uploadImage,
	getImageFile,
	getCounters,
}



/*** Method to get counts ***/
async function getCountFollow(user_id){
	try{
		var following = await Follow.count({'user':user_id}).exec()
		.then((count) => {
			return count;
		})
		.catch((err) => {
			return handleError(err);
		});

		var followed = await Follow.count({'followed':user_id}).exec()
		.then((count) => {
			return count;
		})
		.catch((err) => {
			return handleError(err);
		});

		var publications = await Publication.count({'user':user_id}).exec()
		.then((count) => {
			return count;
		})
		.catch((err) => {
			return handleError(err);
		});

		return {
			following: following,
			followed: followed,
			publications: publications
		}
	} catch(e){
		console.log(e);
	}
}

/*** Method to know if an user follow me and if we follow him***/
async function followThisUser(identity_user_id, user_id){
	try{
		var following = await Follow.findOne({'user':identity_user_id, 'followed':user_id}).exec()
		.then((following) => {
			return following;
		})
		.catch((err) => {
			return handleError(err);
		});

		var followed = await Follow.findOne({'user':user_id, 'followed':identity_user_id}).exec()
		.then((followed) => {
			return followed;
		})
		.catch((err) => {
			return handleError(err);
		});

		return {
			following: following,
			followed: followed
		}
	} catch(e){
		console.log(e);
	}
}

/*** method to get the ids of the users followed and follow me ***/
async function followUserIds(user_id){
	try{
		
		var followings = await Follow.find({'user':user_id}).select({'_id':0, '_v':0, 'user':0}).exec()
		.then((followings) => {
			var follows_clean = [];

			followings.forEach((follow) => {
				follows_clean.push(follow.followed);
			});

			return follows_clean;
		})
		.catch((err) => {
			return handleError(err);
		});

		var followeds = await Follow.find({'followed':user_id}).select({'_id':0, '_v':0, 'followed':0}).exec()
		.then((followeds) => {
			var follows_clean = [];

			followeds.forEach((follow) => {
				follows_clean.push(follow.user);
			});

			return follows_clean;
		})
		.catch((err) => {
			return handleError(err);
		});

		return {
			following: followings,
			followed: followeds
		}

	} catch(e){
		console.log(e);
	}
}

/*** Method to remove files ***/
function removeFilesUploads(res, file_path, message){
	fs.unlink(file_path, (err) => {
		return res.status(200).send({message: message});
	});
}