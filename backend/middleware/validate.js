import ApiError from "../utils/ApiError.js";

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const messages = result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return next(new ApiError(400, messages.join(", ")));
  }
  req.body = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const messages = result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return next(new ApiError(400, messages.join(", ")));
  }
  req.params = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const messages = result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return next(new ApiError(400, messages.join(", ")));
  }
  req.validatedQuery = result.data;
  next();
};

export default validate;
