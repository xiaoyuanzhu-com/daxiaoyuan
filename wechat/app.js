App({
  onLaunch() {},

  // Shared in-memory state. Survives across page navigations within a session.
  globalData: {
    // DEV: 'http://localhost:8080'  (仅模拟器有效;真机预览需要改回局域网 IP)
    // PROD: 'https://ddxy.xiaoyuanzhu.com'
    // ⚠️ 发布前必须改回 production!
    apiBase: 'https://ddxy.xiaoyuanzhu.com',

    // 腾讯位置服务 key,citySelector 插件用。控制台 -> 我的应用 -> 添加 Key,
    // 勾选「WebServiceAPI」+「微信小程序」并配置小程序 APPID。
    // 未配置时插件页会显示空白。
    tencentMapKey: 'DMUBZ-TV46Z-G7EXS-ZHTA6-EUFVQ-BEB2J',
  },
});
