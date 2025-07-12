const User = require('../models/User');
const generateToken = require('../utils/generateToken');

exports.register = async (req, res) => {
  const { username, password } = req.body;

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ message: '중복 아이디' });

  const user = new User({ username });
  await user.setPassword(password);
  await user.save();

  const token = generateToken(user);
  res.status(201).json({ token });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !(await user.validatePassword(password)))
    return res.status(401).json({ message: '아이디나 비밀번호 오류' });

  const token = generateToken(user);
  res.json({ token });
};

exports.checkDuplicate = async (req, res) => {
  const { username } = req.query;

  const exists = await User.findOne({ username });
  res.json({ available: !exists });
};