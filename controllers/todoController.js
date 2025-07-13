const Todo = require('../models/Todo');
const asyncHandler = require('../middlewares/asyncHandler');
const dayjs = require('dayjs');

// GET /api/todos?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getTodos = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const owner = req.user.id;                 // JWT 미들웨어가 넣어둠

  const filter = {
    owner,
    deadline: {
      $gte: dayjs(start).startOf('day').toDate(),
      $lte: dayjs(end).endOf('day').toDate(),
    },
  };

  const todos = await Todo.find(filter)
    .select('title deadline completed')      // projection (용량 ↓)
    .lean();

  res.json(todos);
});

exports.createTodo = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  const { title, deadline } = req.body;
  const todo = await Todo.create({ title, deadline, owner });
  res.status(201).json(todo);
});

exports.updateTodo = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  const { id } = req.params;
  const todo = await Todo.findOneAndUpdate(
    { _id: id, owner },
    req.body,
    { new: true, runValidators: true }
  );
  if (!todo) return res.status(404).json({ message: 'Todo not found' });
  res.json(todo);
});

exports.deleteTodo = asyncHandler(async (req, res) => {
  const owner = req.user.id;
  await Todo.findOneAndDelete({ _id: req.params.id, owner });
  res.status(204).end();
});
