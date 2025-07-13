const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nickname: { type: String, required: true},
  passwordHash: { type: String, required: true },
});

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const { passwordHash, __v, ...safeData } = this.toObject();
  return safeData;
};

module.exports = mongoose.model('User', userSchema);