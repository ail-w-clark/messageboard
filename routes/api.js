'use strict';

const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false }
});

const threadSchema = new mongoose.Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  board: { type: String, required: true },
  replies: [replySchema]
});

const Thread = mongoose.model('Thread', threadSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post((req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      if (!text || !delete_password) {
        return res.status(400).json({ error: 'text and delete_password are required' });
      }

      const thread = new Thread({
        text,
        delete_password,
        board
      });

      thread.save()
        .then(savedThread => {
          res.json({
            _id: savedThread._id,
            text: savedThread.text,
            created_on: savedThread.created_on,
            bumped_on: savedThread.bumped_on,
            replies: []
          });
        })
        .catch(error => {
          console.error('Error saving thread:', error);
          res.status(500).json({ error: 'Failed to create thread' });
        });
    })
    .get((req, res) => {
      const board = req.params.board;
      Thread.find({ board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .then(threads => {
          const response = threads.map(thread => ({
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replies: thread.replies.slice(-3).map(reply => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }))
          }));
          res.json(response);
        })
        .catch(error => {
          console.error('Error fetching threads:', error);
          res.status(500).send('Error fetching threads');
        });
    })
    .delete((req, res) => {
      const { thread_id, delete_password } = req.body;

      if (!thread_id || !delete_password) {
        return res.status(400).send('thread_id and delete_password are required');
      }

      Thread.findById(thread_id)
        .then(thread => {
          if (!thread) {
            return res.status(404).send('Thread not found');
          }

          if (thread.delete_password !== delete_password) {
            return res.send('incorrect password');
          }

          return Thread.deleteOne({ _id: thread_id }).then(() => res.send('success'));
        })
        .catch(error => {
          console.error('Error deleting thread:', error);
          res.status(500).send('error'); 
        });
    })
    .put((req, res) => {
      const { thread_id } = req.body;
      Thread.findByIdAndUpdate(thread_id, { reported: true })
        .then(() => res.send('reported'))
        .catch(error => {
          console.error('Error reporting thread:', error);
          res.status(500).send('error');
        });
    });

  app.route('/api/replies/:board')
  .post((req, res) => {
    const { thread_id, text, delete_password } = req.body;
    const board = req.params.board;
  
    if (!text || !delete_password || !thread_id) {
      return res.status(400).json({ error: 'text, delete_password, and thread_id are required' });
    }
  
    const reply = {
      text,
      delete_password,
      created_on: new Date(),
      reported: false 
    };
  
    Thread.findById(thread_id)
      .then(thread => {
        if (!thread) return res.status(404).send('Thread not found');
  
        thread.replies.push(reply);
        thread.bumped_on = reply.created_on;
  
        return thread.save();
      })
      .then(updatedThread => {
        const newReply = updatedThread.replies[updatedThread.replies.length - 1];
        res.json({ message: 'Reply added successfully', replyId: newReply._id });
      })
      .catch(error => {
        console.error('Error adding reply:', error);
        res.status(500).send('Error adding reply');
      });
    })  
    .get((req, res) => {
      const { thread_id } = req.query;
      Thread.findById(thread_id)
        .then(thread => {
          if (!thread) return res.status(404).send('Thread not found');
          const response = {
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replies: thread.replies.map(reply => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }))
          };
          res.json(response);
        })
        .catch(error => {
          console.error('Error fetching replies:', error);
          res.status(500).send('Error fetching replies');
        });
    })    
    .delete((req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
    
      Thread.findOne({ _id: thread_id, 'replies._id': reply_id })
        .then(thread => {
          if (!thread) return res.status(404).send('Reply not found');
    
          const reply = thread.replies.id(reply_id);
          if (!reply) return res.status(404).send('Reply not found'); 
    
          if (reply.delete_password !== delete_password) {
            return res.send('incorrect password');
          }
    
          reply.text = '[deleted]';
          return thread.save().then(() => res.send('success'));
        })
        .catch(error => {
          console.error('Error deleting reply:', error);
          res.status(500).send('error');
        });
    })
    .put((req, res) => {
      const { thread_id, reply_id } = req.body;

      Thread.findOneAndUpdate(
        { _id: thread_id, 'replies._id': reply_id },
        { $set: { 'replies.$.reported': true } }
      )
      .then(() => res.send('reported'))
      .catch(error => {
        console.error('Error reporting reply:', error);
        res.status(500).send('error');
      });
    });
};
