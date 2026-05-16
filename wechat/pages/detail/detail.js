const { fetchSchool } = require('../../utils/api.js');
const { decorateSchool } = require('../../utils/decorate.js');

Page({
  data: {
    loading: true,
    error: '',
    school: null,
    modal: { visible: false, title: '', qrcodeUrl: '', hint: '', link: '' },
  },

  onLoad(opts) {
    this.schoolId = opts.id;
    this.loadSchool();
  },

  async loadSchool() {
    this.setData({ loading: true, error: '' });
    try {
      const raw = await fetchSchool(this.schoolId);
      const school = decorateSchool(raw);
      this.setData({ school, loading: false });
      wx.setNavigationBarTitle({ title: school.name });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  retry() {
    this.loadSchool();
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
        qrcodeUrl: r.qrcodeUrl || '',
        hint: r.hint || '',
        link: r.link || '',
        officialAccount: r.officialAccount || '',
        miniProgram: r.miniProgram || '',
      },
    });
  },

  closeModal() {
    this.setData({ 'modal.visible': false });
  },

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
    this.copyValue(this.data.modal.link, '链接已复制');
  },

  copyOfficialAccount() {
    this.copyValue(this.data.modal.officialAccount, '公众号名称已复制');
  },

  copyMiniProgram() {
    this.copyValue(this.data.modal.miniProgram, '小程序名称已复制');
  },

  copyValue(value, toast) {
    if (!value) return;
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: toast, icon: 'success' }),
    });
  },
});
