const router = require('express').Router();
const todoCtrl = require('../controllers/todoController');
const { authenticateAccessToken } = require('../middlewares/authMiddleware');

router
  .route('/')
  .get(todoCtrl.getTodos)       // ?start=&end=
  .post(todoCtrl.createTodo);

router
  .route('/:id')
  .patch(todoCtrl.updateTodo)
  .delete(todoCtrl.deleteTodo);

module.exports = router;
