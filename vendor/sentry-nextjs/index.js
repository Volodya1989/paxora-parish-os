function init() {}

function captureException() {
  return "";
}

function captureRequestError() {
  return undefined;
}

function withSentryConfig(nextConfig) {
  return nextConfig;
}

module.exports = {
  init,
  captureException,
  captureRequestError,
  withSentryConfig
};
