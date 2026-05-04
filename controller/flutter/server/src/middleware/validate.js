'use strict';

const { AppError } = require('./errorHandler');

function validate(schema, target = 'body') {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req[target], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const details = error.details.map((d) => d.message).join('; ');
            return next(new AppError(`Validation failed: ${details}`, 400, 'VALIDATION_ERROR'));
        }

        req[target] = value;
        next();
    };
}

module.exports = { validate };