"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("@/utils/logger");
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log error
    logger_1.logger.error('Error occurred', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map