const config = require('./config');

App({
  onLaunch() {},

  // Shared in-memory state. Survives across page navigations within a session.
  globalData: {
    apiBase: config.apiBase,
    tencentMapKey: config.tencentMapKey,
  },
});
