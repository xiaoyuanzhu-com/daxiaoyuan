// i18n strings + tiny helper.

export const STR = {
  appName:        { zh: '大大校园',                       en: 'Daxiaoyuan' },
  tagline:        { zh: '记录国内大学校园开放状况',     en: 'Tracking openness of Chinese university campuses' },
  brandKicker:    { zh: '大同 · 大公 · 大',             en: 'open · public · inclusive' },
  beijing:        { zh: '北京',                         en: 'Beijing' },

  tabMap:         { zh: '地图',     en: 'Map' },
  tabList:        { zh: '列表',     en: 'List' },

  nearby:         { zh: '附近学校', en: 'Nearby schools' },
  schoolsCount:   { zh: '所学校',   en: 'schools' },
  filter:         { zh: '筛选',     en: 'Filter' },
  search:         { zh: '搜索学校 / 设施', en: 'Search schools or facilities' },
  noMatch:        { zh: '没有符合条件的学校', en: 'No schools match' },

  facilities:     { zh: '设施',     en: 'Facilities' },

  aboutTitle:     { zh: '关于',  en: 'About' },

  // —— 引
  aboutQ1Body:    { zh: '大学之道，在明明德，在亲民，在止于至善。',
                    en: 'The way of great learning lies in manifesting illustrious virtue, in being close to the people, and in coming to rest in the highest good.' },
  aboutQ1Source:  { zh: '——《大学》', en: '— The Great Learning' },

  // —— 述
  aboutN1:        { zh: '大学的园子、操场、图书馆、湖边，本来就是一座城市的一部分。',
                    en: 'A university’s gardens, fields, library and lakeside have always been part of the city around it.' },
  aboutN2:        { zh: '新冠之后，许多大学关上了对外的门。市民失去了散步、读书、看银杏的地方；而「今天那所学校能不能进去」这件本应清晰的事，散落在过期新闻与小红书帖子里，无从查证。',
                    en: 'After the pandemic, many campuses closed their doors. Residents lost places to walk, to read, to see the ginkgos turn; and the simple question “can I get into this campus today?” became something only stale news and scattered posts could half-answer.' },
  aboutN3:        { zh: '「大大校园」逐校核对每所学校今天的开放状况，免费、公开、人人可查。',
                    en: 'Daxiaoyuan checks the openness of each campus, one by one — free, public, and open to anyone.' },

  // —— 呼
  aboutQ2Body:    { zh: '故外户而不闭，是谓大同。',
                    en: 'When the outer doors need not be shut — this is what is called the Great Unity.' },
  aboutQ2Source:  { zh: '——《礼记·礼运》', en: '— Book of Rites, Liyun' },
  aboutCallBody:  { zh: '这是难抵达的理想。我们能做的，是让现状先被看见；你能做的，是下次走过某所学校之后，回来告诉我们一声——「今天进去了 / 没进去」。',
                    en: 'It is a far ideal. What we can do is make the present visible. What you can do is tell us next time you walk past a campus — “I got in today” or “I didn’t.”' },
  aboutQ3Body:    { zh: '苟日新，日日新，又日新。',
                    en: 'If renewed for a day, renewed day by day, and renewed yet again.' },
  aboutQ3Source:  { zh: '——《大学》引《盘铭》', en: '— Inscribed on Tang’s washbasin, cited in The Great Learning' },

  // —— 落款
  aboutDedication: { zh: '致每一位曾在校园里走过的人。',
                     en: 'For everyone who has ever walked through a campus.' },

  openSourceKicker: { zh: '开源 · 开放数据', en: 'Open source · open data' },
  openSourceBody:   { zh: '所有学校数据公开存放在 GitHub，欢迎 PR 与审计。',
                       en: 'All school data lives openly on GitHub. PRs and audits welcome.' },

  citiesTitle:    { zh: '城市',     en: 'Cities' },
  citiesActive:   { zh: '已上线',   en: 'Live' },
  citiesSoon:     { zh: '即将上线', en: 'Coming' },
  addYourCity:    { zh: '想加入你所在的城市?', en: 'Want your city added?' },
  addYourCityBody: { zh: '在 GitHub 上提交一份种子数据,我们会尽快上线。',
                     en: "Submit seed data on GitHub and we'll bring it online." },
  accessible:     { zh: '可进入', en: 'accessible' },
  schoolsShort:   { zh: '所',     en: 'schools' },

  filterStatus:   { zh: '开放等级', en: 'Status' },
  filterFac:      { zh: '设施',     en: 'Facilities' },
  reset:          { zh: '重置',     en: 'Reset' },
  apply:          { zh: '应用',     en: 'Apply' },
  results:        { zh: '结果',     en: 'results' },

  km:             { zh: '公里',     en: 'km' },

  exploreTitle:   { zh: '榜单',     en: 'Rankings' },
  tabCities:      { zh: '城市',     en: 'Cities' },
  tab985:         { zh: '985',      en: '985' },
  tab211:         { zh: '211',      en: '211' },
  tabC9:          { zh: 'C9',       en: 'C9' },
  tabQS30:        { zh: 'QS30',     en: 'QS30' },
  tabShuangYiLiu: { zh: '双一流',   en: 'Double First-Class' },
  rankEmpty:      { zh: '暂无数据', en: 'No data yet' },
};

export const t = (key, lang) => STR[key]?.[lang] ?? key;
