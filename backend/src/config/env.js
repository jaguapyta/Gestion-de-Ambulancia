module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'seme_jwt_secret_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
};