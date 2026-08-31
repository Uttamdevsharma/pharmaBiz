"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schemas) => {
    return (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                const parsed = schemas.query.parse(req.query);
                Object.defineProperty(req, "query", {
                    value: parsed,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            }
            if (schemas.params) {
                const parsed = schemas.params.parse(req.params);
                Object.defineProperty(req, "params", {
                    value: parsed,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorDetails = error.issues
                    .map((err) => `${err.path.join(".") || "root"}: ${err.message}`)
                    .join("; ");
                res.status(400).json({
                    success: false,
                    message: errorDetails ? `Validation error: ${errorDetails}` : "Validation error",
                    errors: error.issues.map((err) => ({
                        field: err.path.join("."),
                        message: err.message,
                    })),
                });
                return;
            }
            res.status(400).json({
                success: false,
                message: "Invalid request payload",
            });
        }
    };
};
exports.validateRequest = validateRequest;
