// middleware/attachIo.js
export const attachIo = (io) => (req, res, next) => {
  req.io = io;
  next();
};
  