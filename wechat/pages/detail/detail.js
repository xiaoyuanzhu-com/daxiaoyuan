const { findSchool } = require('../../utils/data.js');
const { decorateSchool } = require('../../utils/decorate.js');

const SCHEDULE_KEYS = [
  { key: 'weekday', label: '工作日' },
  { key: 'weekend', label: '周末' },
  { key: 'summer',  label: '寒暑假' },
];

Page({
  data: {
    school: null,
    scheduleRows: [],
    modal: { visible: false, title: '', qrcodeUrl: '', hint: '', link: '' },
  },

  onLoad(opts) {
    const raw = findSchool(opts.id);
    if (!raw) {
      this.setData({ school: null });
      return;
    }
    const school = decorateSchool(raw);
    const scheduleRows = SCHEDULE_KEYS.map((k) => ({
      key: k.key,
      label: k.label,
      value: school.schedule[k.key],
    }));
    this.setData({ school, scheduleRows });

    wx.setNavigationBarTitle({ title: school.name });
  },

  openCampusReservation() {
    const r = this.data.school.reservation;
    if (!r) return;
    this.showModal(`${this.data.school.name} 预约入校`, r);
  },

  openFacilityReservation(e) {
    const key = e.currentTarget.dataset.key;
    const facility = this.data.school.facilitiesList.find((f) => f.key === key);
    if (!facility || !facility.reservation) return;
    this.showModal(`${facility.label}预约`, facility.reservation);
  },

  showModal(title, r) {
    this.setData({
      modal: {
        visible: true,
        title,
        qrcodeUrl: r.qrcodeUrl,
        hint: r.hint || '',
        link: r.link || '',
      },
    });
  },

  closeModal() {
    this.setData({ 'modal.visible': false });
  },

  // Prevent taps inside the sheet from bubbling to the mask.
  noop() {},

  saveQrcode() {
    const url = this.data.modal.qrcodeUrl;
    if (!url) return;
    wx.showLoading({ title: '保存中', mask: true });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            const denied = err && err.errMsg && err.errMsg.indexOf('auth deny') !== -1;
            wx.showToast({
              title: denied ? '需相册权限' : '保存失败',
              icon: 'none',
            });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  copyLink() {
    const link = this.data.modal.link;
    if (!link) return;
    wx.setClipboardData({
      data: link,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },
});
