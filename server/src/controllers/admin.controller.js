const libraryService = require('../services/library.service');

const toAdminUser = (user) => {
  const out = { ...user };
  if (out._id) {
    out.id = String(out._id);
    delete out._id;
  }
  return out;
};

const listUsers = async (req, res) => {
  const items = await libraryService.listUsers({ limit: req.query.limit });
  res.json({ items: items.map(toAdminUser) });
};

const updateUserRole = async (req, res) => {
  const user = await libraryService.updateUserRole(req.params.id, req.body.role);
  res.json({ user });
};

const deleteUser = async (req, res) => {
  await libraryService.deleteUser(req.params.id);
  res.status(204).send();
};

module.exports = {
  listUsers,
  updateUserRole,
  deleteUser,
};
