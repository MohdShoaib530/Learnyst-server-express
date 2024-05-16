import fs from 'fs';

const errorMiddleware = (err, req, res, _next) => {

  if (req.file?.path) {
    fs.unlinkSync(req.file.path);
  }
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Error middleware issue';

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    stack: err.stack
  });

};

export default errorMiddleware;