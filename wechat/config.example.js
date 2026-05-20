// 本地配置模板。复制为 config.js 后填入真实值。config.js 不入库。
//
// 第一次 clone 仓库后:
//   cp config.example.js config.js
//   填入 tencentMapKey,根据 dev/prod 切换 apiBase

module.exports = {
  // DEV: 'http://localhost:8080'  (仅模拟器有效;真机预览需要改回局域网 IP)
  // PROD: 'https://ddxy.xiaoyuanzhu.com'
  apiBase: 'https://ddxy.xiaoyuanzhu.com',

  // 腾讯位置服务 key,citySelector 插件用。控制台 -> 我的应用 -> 添加 Key,
  // 勾选「WebServiceAPI」+「微信小程序」并配置小程序 APPID。
  tencentMapKey: '',
};
