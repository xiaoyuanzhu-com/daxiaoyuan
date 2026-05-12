App({
  onLaunch() {},

  // Shared in-memory state. Survives across page navigations within a session.
  globalData: {
    // DEV: 'http://192.168.124.56:8080'   ← 你机器的局域网 IP(ipconfig getifaddr en0)
    // PROD: 'https://ddxy.xiaoyuanzhu.com'
    // ⚠️ 发布前必须改回 production!
    apiBase: 'http://192.168.124.56:8080',
  },
});
