'use strict'

var mongoosePaginate = require('mongoose-pagination');
var moment = require('moment');

var User = require ('../models/user');
var Follow = require ('../models/follow');
var Message = require ('../models/message');


/*** Test method ***/
function pruebasMessage(req, res){
	res.status(200).send({message: 'Saludos desde el contralador de Messages'});
}

/*** Method to send messages ***/
function saveMessage(req, res){
	var params = req.body;

	if(!params.text || !params.receiver) return res.status(200).send({message: 'Error, send all required data'});

	var message = new Message();
	message.emitter = req.user.sub;
	message.receiver = params.receiver;
	message.text = params.text;
	message.created_at = moment().unix();
	message.viewed = false;

	message.save((err, messageStored) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(!messageStored) return res.status(404).send({message: 'Error by sending the message'});

		return res.status(200).send({message: messageStored});
	});
}

/*** Method to get received messages ***/
function getReceivedMessages(req, res){
	var user_id = req.user.sub;

	var page = 1;
	if (req.params.page) {
		page = req.params.page;
	}

	var items_per_page = 5;

	Message.find({receiver: user_id}).sort('-created_at').populate('receiver emitter', '_id name surname nick image').paginate(page, items_per_page, (err, messages, total) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(total == 0) return res.status(404).send({message: 'There are not received messages'});

		return res.status(200).send({
			total : total,
			pages : Math.ceil(total/items_per_page),
			messages : messages
		});
	});
}

/*** Method to list sent messages ***/
function getEmittedMessages(req, res){
	var user_id = req.user.sub;

	var page = 1;
	if (req.params.page) {
		page = req.params.page;
	}

	var items_per_page = 5;

	Message.find({emitter: user_id}).sort('-created_at').populate('receiver', '_id name surname nick image').paginate(page, items_per_page, (err, messages, total) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(total == 0) return res.status(404).send({message: 'There are not received messages'});

		return res.status(200).send({
			total : total,
			pages : Math.ceil(total/items_per_page),
			messages : messages
		});
	});
}

/***Method to list unread messages ***/
function getUnviewedMessages(req, res){
	var user_id = req.user.sub;

	var page = 1;
	if (req.params.page) {
		page = req.params.page;
	}

	var items_per_page = 5;

	Message.find({receiver: user_id, viewed: false}).sort('-created_at').populate('emitter receiver', '_id name surname nick image').paginate(page, items_per_page, (err, messages, total) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		if(total == 0) return res.status(404).send({message: 'No hay mensajes no leidos'});

		return res.status(200).send({
			total : total,
			pages : Math.ceil(total/items_per_page),
			messages : messages
		});
	});
}

/*** Method to count unread messages ***/
function countUnviewedMessages(req, res){
	var user_id = req.user.sub;

	Message.count({receiver: user_id, viewed: false}).exec((err, count) => {
		if(err) return res.status(500).send({message: 'Error in the request'});
		//if(count == 0) return res.status(404).send({message: 'There are not unread messages'});

		return res.status(200).send({
			'unviewed' : count
			});
	});
}

/*** Method to 'seen' messages ***/
function setViewedMessages(req, res){
	var user_id = req.user.sub;


	Message.update({receiver: user_id, viewed: false}, {viewed: true}, {'multi':true}).exec((err, messagesUpdated) => {
		if(err) return res.status(500).send({message: 'Error in the request'});

		return res.status(200).send({
			messages : messagesUpdated
		});
	});
}

module.exports = {
	pruebasMessage,
	saveMessage,
	getReceivedMessages,
	getEmittedMessages,
	getUnviewedMessages,
	countUnviewedMessages,
	setViewedMessages
}