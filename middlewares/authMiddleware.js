const jwt = require('jsonwebtoken');

const authenticateAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: '토큰 없음' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ message: '유효하지 않은 토큰' });
  }
};

module.exports = { authenticateAccessToken };