'use strict'

var path = require('path');
var fs = require('fs');
var mongoosePaginate = require('mongoose-pagination');
var moment = require('moment');

var Publication = require('../models/publication');
var Follow = require('../models/follow');
var User = require('../models/user');



/*** Test method ***/
function probando(req, res){
	res.status(200).send({message: 'Hello world from publication controller'});
}

/*** Method to save publications ***/
function savePublication(req, res){
	var params = req.body;

	if(!params.text) return res.status(200).send({message: 'Error, text is required'});
	var publication = new Publication();
	publication.text = params.text;
	publication.file = null;
	publication.user = req.user.sub;
	publication.created_at = moment().unix();

	publication.save((err, publicationStored) => {
		if(err) return res.status(500).send({message: 'Error by saving publication'});
		if(!publicationStored) return res.status(404).send({message: 'Error, publication havent been saved'});

		return res.status(200).send({publicationStored});
	});
}

/*** Method to get users publication that I follow  ***/
function getPublications(req, res){

	var page = 1;
	if(req.params.page){
		page = req.params.page;
	}

	var items_per_page = 5;

	Follow.find({user: req.user.sub}).exec((err,follows) => {
		if(err) return res.status(500).send({message: 'Error while following back'});

		var follows_clean = [];

		follows.forEach((follow) => {
			follows_clean.push(follow.followed);
		});
		follows_clean.push(req.user.sub); 

		Publication.find({user: {'$in': follows_clean}}).sort('-created_at').populate('user', 'name surname image _id').paginate(page, items_per_page, (err, publications, total) => {
			if(err) return res.status(500).send({message: 'Error by getting publications'});
			if(total == 0) return res.status(404).send({message: 'There are not publications'});

			return res.status(200).send({
				total_items: total,
				pages: Math.ceil(total/items_per_page),
				page: page,
				items_per_page: items_per_page,
				publications
			})
		});
	});
}

/*** Method to get an user publictions ***/
function getPublicationsByUser(req, res){
	var user_id;
	var page = 1;

	if(!req.params.id){
		return res.status(500).send({message: 'Error by getting publications'});
	}else{
		user_id  = req.params.id;
	}
	if(req.params.page){
		page = req.params.page;
	}

	var items_per_page = 5;

	Publication.find({user: user_id}).sort('-created_at').populate('user', 'name surname image _id').paginate(page, items_per_page, (err, publications, total) => {
		if(err) return res.status(500).send({message: 'Error by getting publications'});
		if(total == 0) return res.status(404).send({message: 'There are not publications'});

		return res.status(200).send({
			total_items: total,
			pages: Math.ceil(total/items_per_page),
			page: page,
			items_per_page: items_per_page,
			publications
		})
	});
}

/*** Method to get publication by id***/
function getPublication(req, res){
	var publication_id = req.params.id;

	Publication.findById(publication_id, (err, publication) => {
		if(err) return res.status(500).send({message: 'Error by getting publication'});
		if(publication.length == 0) res.status(404).send({message: 'the publication doesnt exist'});

		return res.status(200).send({publication});
	});
}

function deletePublication(req, res){
	var publication_id = req.params.id;

	Publication.findOneAndRemove({user: req.user.sub, '_id':publication_id},(err, publicationRemoved) => {
		if(err) return res.status(500).send({message: 'Error by removing publication'});
		if(!publicationRemoved) res.status(404).send({message: 'The publication has not been removed'});

		return res.status(200).send({message: 'Publication removed successfully'});
	});
}

/*** Method to upload files to publication ***/
function uploadImage(req, res){
	var publication_id = req.params.id;

	if(req.files){ 
		var file_path = req.files.image.path;
		var file_split = file_path.split('\\'); 

		var file_name = file_split[2];

		var ext_split = file_name.split('\.');
		var file_ext = ext_split[1];

		if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){

			Publication.findOne({'user': req.user.sub, '_id':publication_id}).exec((err, publication) => {
				if (publication){
					Publication.findByIdAndUpdate(publication_id, {file: file_name}, {new:true}, (err, publicationUpdated) => {
						if(err) return res.status(500).send({message: 'Error in the request'});
						if(!publicationUpdated) return res.status(404).send({message: 'The publication has not been updated'});

						return res.status(200).send({publication: publicationUpdated});
					});
				}else{
					return removeFilesUploads(res, file_path, 'You dont have rights to update this publication');
				}
			});

		} else {
			return removeFilesUploads(res, file_path, 'Invalid extension');
		}

	} else {
		return res.status(200).send({message: 'No files havent been upload'});
	}
}

/*** Method to get the publication file ***/
function getImageFile(req, res){
	var image_file = req.params.imageFile;
	var path_file = './uploads/publications/'+image_file;

	fs.exists(path_file, (exists) => {
		if(exists){
			res.sendFile(path.resolve(path_file));
		}else{
			res.status(200).send({message: 'Image doesnt exist'});
		}
	});
}


module.exports = {
	probando,
	savePublication,
	getPublications,
	getPublicationsByUser,
	getPublication,
	deletePublication,
	uploadImage,
	getImageFile,
}


/*** Method to deled upload files ***/
function removeFilesUploads(res, file_path, message){
	fs.unlink(file_path, (err) => {
		return res.status(200).send({message: message});
	});
}