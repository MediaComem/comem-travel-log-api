const jwt = require('jsonwebtoken');

const config = require('../config');
const User = require('../models/user');
const { route } = require('./express');
const { createError } = require('./errors');

const authenticate = route(async (req, res, next) => {

  const authorizationHeader = req.get('Authorization');
  if (!authorizationHeader) {
    throw createError(401, 'authHeaderMissing', 'Authorization header is missing');
  }

  const match = authorizationHeader.match(/^Bearer (.+)$/);
  if (!match) {
    throw createError(401, 'authHeaderMalformed', 'Authorization header is not a valid bearer token (format must be "Bearer TOKEN")');
  }

  const token = match[1];

  let claims;
  try {
    claims = await verifyJwt(token);
  } catch (err) {
    if (err.message === 'jwt expired') {
      throw createError(401, 'authTokenExpired', 'Authentication token has expired');
    } else {
      throw authTokenInvalidError();
    }
  }

  const user = await User.findOne({ apiId: claims.sub });
  if (!user) {
    throw authTokenInvalidError();
  }

  req.currentUser = user;
  next();
});

const authorize = func => route(async (req, res, next) => {

  const authorized = await func(req);
  if (!authorized) {
    throw forbiddenError();
  }

  next();
});

function forbiddenError() {
  return createError(403, 'forbidden', 'You are not authorized to perform this action; authenticate with a user account that has more privileges');
}

function authTokenInvalidError() {
  return createError(401, 'authTokenInvalid', 'Authentication token is invalid');
}

function verifyJwt(token) {
  return new Promise((resolve, reject) => jwt.verify(token, config.secret, (err, claims) => err ? reject(err) : resolve(claims)));
}

module.exports = { authenticate, authorize, forbiddenError };
