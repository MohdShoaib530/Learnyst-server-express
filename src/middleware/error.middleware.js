import fs from 'fs'

const errorMiddleware = (err, req, res, _next) => {
    fs.unlinkSync(req.files.avatar[0].path)
    fs.unlinkSync(req.files.coverImage[0].path)

    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Error middleware issue"

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
        stack: err.stack
    })

}

export default errorMiddleware;