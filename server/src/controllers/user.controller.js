const libraryService = require('../services/library.service');

const updateCurrentUser = async (req, res) => {
  const user = await libraryService.updateCurrentUser(req.user._id, req.body);
  res.json({ user });
};

module.exports = {
  updateCurrentUser,
};
