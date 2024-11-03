const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose = require('mongoose');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let threadId; 
  let replyId; 
  const board = 'testBoard'; 
  const validPassword = 'validpassword';
  const invalidPassword = 'invalidpassword';

  test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post(`/api/threads/${board}`)
      .send({
        text: 'This is a test thread',
        delete_password: validPassword
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.exists(res.body._id);
        threadId = res.body._id; 
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai.request(server)
      .get(`/api/threads/${board}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach(thread => {
          assert.exists(thread._id);
          assert.exists(thread.text);
          assert.exists(thread.replies);
          assert.isAtMost(thread.replies.length, 3);
        });
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function(done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({
        thread_id: threadId,
        delete_password: invalidPassword
      })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function(done) {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({
        thread_id: threadId,
        delete_password: validPassword
      })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai.request(server)
      .put(`/api/threads/${board}`)
      .send({ thread_id: threadId })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new thread and reply: POST requests', function(done) {
    chai.request(server)
      .post(`/api/threads/${board}`)
      .send({
        text: 'This is a test thread',
        delete_password: validPassword
      })
      .then(res => {
        assert.equal(res.status, 200);
        assert.exists(res.body._id);
        threadId = res.body._id; 
  
        return chai.request(server)
          .post(`/api/replies/${board}`)
          .send({
            board: board,
            thread_id: threadId,
            text: 'This is a test reply',
            delete_password: validPassword
          });
      })
      .then(res => {
        replyId = res.body.replyId;
        assert.equal(res.status, 200);
        assert.equal(res.body.message, 'Reply added successfully'); 
        done();
      })
      .catch(err => {
        console.error(err); 
        done(err); 
      })
    });
  
  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    chai.request(server)
      .get(`/api/replies/${board}?thread_id=${threadId}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.exists(res.body._id);
        assert.exists(res.body.replies);
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function(done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({
        thread_id: threadId,  
        reply_id: replyId,     
        delete_password: invalidPassword 
      })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password'); 
        done();
      });
  });  

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function(done) {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: validPassword
      })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    chai.request(server)
      .put(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId
      })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });
});
