/**
 * Test configuration for different environments
 */

const environments = {
  staging: 'https://toolassets.haptikapi.com/js-sdk/html/demoqp.html?business-id=8867&client-id=75d87f5185a3d04bf1129320bc4a93237877f2d1&api-key=npci:otoh9oes4gap1oe798jcxl91ffzq0ixd3jnleb3d&base-url=https://staging.hellohaptik.com/&xdk=true',
  // production: 'https://toolassets.haptikapi.com/js-sdk/html/demoqp.html?business-id=8500&client-id=75d87f5185a3d04bf1129320bc4a93237877f2d1&api-key=npci:8jdx4x12rumk9omntb261af1d8ympxl9212hbkky&base-url=https://staging.hellohaptik.com/&xdk=true'
};

/**
 * Gets the test URL for the specified environment
 * @param {string} env - Environment name (staging, production)
 * @returns {string} Complete test URL
 */
function getTestUrl(env = 'staging') {
  const url = environments[env];
  if (!url) {
    throw new Error(`Environment '${env}' not found. Available: ${Object.keys(environments).join(', ')}`);
  }
  return url;
}

module.exports = {
  environments,
  getTestUrl
}; 