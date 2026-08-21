/**
 * Sanitizes an object by removing keys that start with '$' or contain '.'
 * to prevent MongoDB operator injection (e.g. { "$gt": "" }).
 *
 * Express 5 compatible — does not touch req.query (read-only getter).
 */
const sanitizeObject = (obj) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (/^\$/.test(key) || /\./.test(key)) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
};

const mongoSanitize = (req, res, next) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
};

export default mongoSanitize;
