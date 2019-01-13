'use strict'

//var path = require('path');
//var fs = require('fs'); // 
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');

/*** Test method ***/
function prueba(req, res){
	res.status(200).send({message: 'Hello world from follow controller'});
}

/*** Follow method ***/
function saveFollow(req, res){
	var params = req.body;

	var follow = new Follow();
	follow.user = req.user.sub;
	follow.followed = params.followed;

	Follow.findOne({user:follow.user,followed:follow.followed}, (err, result) => { // deal with duplicate accounts
		if(err) return res.status(500).send({message: 'An error has occurred by saving the follow'});
		if(result) return res.status(200).send({message: 'You follow this user already'});
		follow.save((err, followStored) => {
			if(err) return res.status(500).send({message: 'Error by saving the follow'});
			if(!followStored) return res.status(404).send({message: 'Follow has not saved'});

			return res.status(200).send({follow: followStored});
		});
	});
}

/*** unfollow method ***/
function deleteFollow(req, res){
	var user_id = req.user.sub;
	var follow_id = req.params.id;

	Follow.find({'user':user_id, 'followed':follow_id}).remove(err => {
		if(err) return res.status(500).send({message: 'Error by deleting the follow'});
		return res.status(200).send({message: 'Follow removed'});
	});
}

/***	
	Pagination method to list followed user. And also following users if an id is sent
*	 
***/
function getFollowingUsers(req, res){
	var user_id = req.user.sub;
	var page = 1;

	if(req.params.id && req.params.page){
		user_id = req.params.id;
		page = req.params.page;
	}
	if(req.params.id){
		if(req.params.id.length>=4){ 
			user_id = req.params.id;
		}else{
			page = req.params.id;
		}
	}

	var items_per_page = 5;

	// Extract all user data with populate()
	Follow.find({user:user_id}).populate('followed', '_id name surname nick image status').paginate(page, items_per_page, (err, follows, total) => {
		if(err) return res.status(500).send({message: 'Server error'});

		User.findById(user_id, '-password', (err, user) => {
			if(err) return res.status(500).send({message: 'Error in the request'});
			if(!user) return res.status(404).send({message: 'The user doesnt exist'});
			if(total == 0) return res.status(200).send({user : user});

			followUserIds(req.user.sub).then((value) => {
				return res.status(200).send({
					total : total,
					user: user,
					pages : Math.ceil(total/items_per_page),
					follows : follows,
					users_following : value.following,
					users_follow_me : value.followed,
					items_per_page: items_per_page
				});
			});
		});
	});
}

/*** Method to get users that follow us ***/
function getFollowedUsers(req, res){
	var user_id = req.user.sub;
	var page = 1;

	if(req.params.id && req.params.page){
		user_id = req.params.id;
		page = req.params.page;
	}
	if(req.params.id){
		if(req.params.id.length>=4){ 
			user_id = req.params.id;
		}else{
			page = req.params.id;
		}
	}

	var items_per_page = 3;

	Follow.find({followed:user_id}).populate('user', '_id name surname nick image status').paginate(page, items_per_page, (err, follows, total) => {
		if(err) return res.status(500).send({message: 'Server error'});

		User.findById(user_id, '-password', (err, user) => {
			if(err) return res.status(500).send({message: 'Error in the request'});
			if(!user) return res.status(404).send({message: 'The user doesnt exist'});
			if(total == 0) return res.status(200).send({user : user});

			followUserIds(req.user.sub).then((value) => {
				return res.status(200).send({
					total : total,
					user: user,
					pages : Math.ceil(total/items_per_page),
					follows : follows,
					users_following : value.following,
					users_followed : value.followed,
					items_per_page: items_per_page
				});
			});
		});
	});
}

/*** Method to list users i follow ***/
function getMyFollows(req, res){
	var user_id = req.user.sub;

	Follow.find({user: user_id}).populate('user followed', '_id name surname nick').exec((err, follows) => {
		if(err) return res.status(500).send({message: 'Server error'});
		if(follows.length == 0) return res.status(404).send({message: 'You dont follow to any user'});

		return res.status(200).send({follows});
	});
}

/*** No paginated method to list followers ***/
function getFollowBacks(req, res){
	var user_id = req.user.sub;

	Follow.find({followed: user_id}).populate('user followed', '_id name surname nick').exec((err, follows) => {
		if(err) return res.status(500).send({message: 'Server error'});
		if(follows.length == 0) return res.status(404).send({message: 'No one user follow you'});

		return res.status(200).send({follows});
	});
}


/*** get ids of following and followed ***/
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

module.exports = {
	prueba,
	saveFollow,
	deleteFollow,
	getFollowingUsers,
	getFollowedUsers,
	getMyFollows,
	getFollowBacks,
}