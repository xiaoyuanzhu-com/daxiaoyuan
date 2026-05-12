// Beijing seed dataset — mirrors frontend/src/data/seed.js.
// Will be replaced by GET dxy.xiaoyuanzhu.com/api/schools in a follow-up.
//
// Shape contracts:
//   facilities[key]    = { status: <STATUS>, reservation?: Reservation }
//   school.reservation = Reservation | undefined  (campus-level booking entry)
//   Reservation        = { qrcodeUrl: string, hint: string, link?: string }
//
// qrcodeUrl is rendered via <image>; long-press identifies QR / mini-program codes.
// link is for "copy link" only — small programs cannot open arbitrary URLs.

const QR_PLACEHOLDER = 'https://placehold.co/600x600/png?text=QR';

const SCHOOLS = [
  {
    id: 'pku', name: '北京大学', short: 'PKU', district: '海淀区',
    status: 'appt', distance: 2.4, lat: 39.992, lng: 116.305,
    entry: ['通过「参观北大」公众号提前预约', '凭身份证刷闸入校', '每日限额,节假日更紧张'],
    schedule: { weekday: '08:30–17:00', weekend: '08:30–22:00', summer: '08:30–22:00' },
    facilities: {
      walk:    { status: 'open' },
      library: { status: 'closed' },
      track:   { status: 'closed' },
      gym:     { status: 'closed' },
      canteen: { status: 'closed' },
    },
    reservation: {
      qrcodeUrl: QR_PLACEHOLDER,
      hint: '关注「参观北大」公众号 → 菜单"个人预约"',
      link: 'https://visit.pku.edu.cn',
    },
    lastUpdate: '3 天前', confirms: 47,
    notes: [
      { date: '今天',   user: '游客 *清', text: '上午 9 点入校,无需排队,西门刷身份证' },
      { date: '昨天',   user: '游客 *和', text: '操场被围起来,只能在主路散步' },
      { date: '3 天前', user: '游客 *安', text: '提前一周才约到周末名额' },
    ],
  },
  {
    id: 'thu', name: '清华大学', short: 'THU', district: '海淀区',
    status: 'appt', distance: 3.1, lat: 40.000, lng: 116.326,
    entry: ['「清华大学参观预约」小程序', '工作日仅周末开放参观', '团体需提前 3 天预约'],
    schedule: { weekday: '不开放', weekend: '08:00–18:00', summer: '08:00–18:00' },
    facilities: {
      walk:    { status: 'appt' },
      library: { status: 'closed' },
      track:   { status: 'closed' },
      gym:     { status: 'closed' },
      canteen: { status: 'closed' },
    },
    reservation: {
      qrcodeUrl: QR_PLACEHOLDER,
      hint: '识别小程序码进入「清华大学参观预约」',
    },
    lastUpdate: '1 天前', confirms: 62,
    notes: [
      { date: '今天',   user: '游客 *远', text: '周六上午约到名额,二校门人很多' },
      { date: '2 天前', user: '游客 *白', text: '工作日不开放参观,被劝返' },
    ],
  },
  {
    id: 'ruc', name: '中国人民大学', short: 'RUC', district: '海淀区',
    status: 'daytime', distance: 1.8, lat: 39.969, lng: 116.319,
    entry: ['刷身份证直接入校', '部分门只对师生开放,走东门', '夜间 22:00 后凭证件'],
    schedule: { weekday: '06:00–22:00', weekend: '06:00–22:00', summer: '06:00–22:00' },
    facilities: {
      walk:    { status: 'open' },
      library: { status: 'closed' },
      track:   { status: 'open' },
      gym:     { status: 'closed' },
      canteen: { status: 'open' },
    },
    lastUpdate: '今天', confirms: 88,
    notes: [
      { date: '今天',   user: '游客 *林', text: '操场可进,晚上有不少周边居民跑步' },
      { date: '4 天前', user: '游客 *舟', text: '食堂一楼对外,刷码支付' },
    ],
  },
  {
    id: 'bnu', name: '北京师范大学', short: 'BNU', district: '海淀区',
    status: 'daytime', distance: 4.2, lat: 39.962, lng: 116.366,
    entry: ['工作日凭身份证 / 周末预约', '南门刷脸通道较快'],
    schedule: { weekday: '07:00–22:00', weekend: '08:00–20:00', summer: '07:00–22:00' },
    facilities: {
      walk:    { status: 'open' },
      library: { status: 'closed' },
      track:   { status: 'open' },
      gym:     {
        status: 'appt',
        reservation: {
          qrcodeUrl: QR_PLACEHOLDER,
          hint: '关注「北师大体育场馆」公众号 → 菜单"预约"',
        },
      },
      canteen: { status: 'closed' },
    },
    lastUpdate: '5 小时前', confirms: 31, notes: [],
  },
  {
    id: 'buaa', name: '北京航空航天大学', short: 'BUAA', district: '海淀区',
    status: 'alumni', distance: 3.6, lat: 39.982, lng: 116.348,
    entry: ['仅师生 / 校友凭证入校', '访客需由校内人员预约登记'],
    schedule: { weekday: '不对外', weekend: '不对外', summer: '不对外' },
    facilities: {
      walk:    { status: 'alumni' },
      library: { status: 'alumni' },
      track:   { status: 'alumni' },
      gym:     { status: 'alumni' },
      canteen: { status: 'alumni' },
    },
    lastUpdate: '6 天前', confirms: 12, notes: [],
  },
  {
    id: 'minzu', name: '中央民族大学', short: 'MUC', district: '海淀区',
    status: 'daytime', distance: 2.0, lat: 39.951, lng: 116.318,
    entry: ['身份证刷闸入校', '夜间 23:00 后东门关闭'],
    schedule: { weekday: '06:00–23:00', weekend: '06:00–23:00', summer: '06:00–23:00' },
    facilities: {
      walk:    { status: 'open' },
      library: { status: 'closed' },
      track:   { status: 'open' },
      gym:     { status: 'closed' },
      canteen: {
        status: 'appt',
        reservation: {
          qrcodeUrl: QR_PLACEHOLDER,
          hint: '关注「民大餐饮服务」公众号 → 菜单"访客就餐"',
        },
      },
    },
    lastUpdate: '2 天前', confirms: 24, notes: [],
  },
  {
    id: 'bit', name: '北京理工大学', short: 'BIT', district: '海淀区',
    status: 'appt', distance: 5.1, lat: 39.962, lng: 116.318,
    entry: ['「北理工参观」公众号预约', '周末名额较多'],
    schedule: { weekday: '09:00–17:00', weekend: '08:00–18:00', summer: '08:00–18:00' },
    facilities: {
      walk:    { status: 'appt' },
      library: { status: 'closed' },
      track:   { status: 'closed' },
      gym:     { status: 'closed' },
      canteen: { status: 'closed' },
    },
    reservation: {
      qrcodeUrl: QR_PLACEHOLDER,
      hint: '关注「北理工参观」公众号 → 菜单"预约入校"',
    },
    lastUpdate: '1 周前', confirms: 18, notes: [],
  },
  {
    id: 'bfsu', name: '北京外国语大学', short: 'BFSU', district: '海淀区',
    status: 'open', distance: 4.8, lat: 39.952, lng: 116.305,
    entry: ['自由出入,无需预约', '夜间通行不受限'],
    schedule: { weekday: '全天', weekend: '全天', summer: '全天' },
    facilities: {
      walk:    { status: 'open' },
      library: {
        status: 'appt',
        reservation: {
          qrcodeUrl: QR_PLACEHOLDER,
          hint: '识别小程序码进入「北外图书馆预约」',
        },
      },
      track:   { status: 'open' },
      gym:     { status: 'open' },
      canteen: { status: 'open' },
    },
    lastUpdate: '今天', confirms: 56,
    notes: [
      { date: '今天', user: '游客 *南', text: '周末带孩子来操场跑步,门卫不查证件' },
    ],
  },
  {
    id: 'cau', name: '中国农业大学', short: 'CAU', district: '海淀区',
    status: 'open', distance: 6.3, lat: 40.001, lng: 116.351,
    entry: ['自由出入', '东校区操场公开使用'],
    schedule: { weekday: '全天', weekend: '全天', summer: '全天' },
    facilities: {
      walk:    { status: 'open' },
      library: {
        status: 'appt',
        reservation: {
          qrcodeUrl: QR_PLACEHOLDER,
          hint: '关注「中国农大图书馆」公众号 → 菜单"入馆预约"',
        },
      },
      track:   { status: 'open' },
      gym:     {
        status: 'appt',
        reservation: {
          qrcodeUrl: QR_PLACEHOLDER,
          hint: '识别小程序码进入「农大体育场馆预约」',
        },
      },
      canteen: { status: 'open' },
    },
    lastUpdate: '2 天前', confirms: 22, notes: [],
  },
  {
    id: 'bupt', name: '北京邮电大学', short: 'BUPT', district: '海淀区',
    status: 'closed', distance: 3.9, lat: 39.961, lng: 116.355,
    entry: ['暂不对外开放', '春季施工期间所有门只走师生'],
    schedule: { weekday: '不对外', weekend: '不对外', summer: '不对外' },
    facilities: {
      walk:    { status: 'closed' },
      library: { status: 'closed' },
      track:   { status: 'closed' },
      gym:     { status: 'closed' },
      canteen: { status: 'closed' },
    },
    lastUpdate: '4 天前', confirms: 9, notes: [],
  },
];

// Active cities MUST include lat and lng (used as the map center when picked).
// Inactive cities may omit them — they are never emitted via eventChannel.
const CITIES = [
  { id: 'bj', name: '北京', schools: 10, openRate: 0.30, active: true, lat: 39.96, lng: 116.34 },
  { id: 'sh', name: '上海', schools: 12, openRate: 0.45, active: false },
  { id: 'gz', name: '广州', schools:  8, openRate: 0.62, active: false },
  { id: 'sz', name: '深圳', schools:  5, openRate: 0.40, active: false },
  { id: 'nj', name: '南京', schools:  9, openRate: 0.50, active: false },
  { id: 'hz', name: '杭州', schools:  6, openRate: 0.55, active: false },
  { id: 'wh', name: '武汉', schools:  7, openRate: 0.35, active: false },
  { id: 'cd', name: '成都', schools:  6, openRate: 0.50, active: false },
];

function findSchool(id) {
  return SCHOOLS.find((s) => s.id === id);
}

module.exports = { SCHOOLS, CITIES, findSchool };
