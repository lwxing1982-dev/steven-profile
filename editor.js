/**
 * editor.js v3 — 网站内容编辑器
 * 功能：登录验证·文字内联编辑·图片上传·Unsplash 图片搜索·悬浮登录入口
 */
(function () {
  'use strict';
  var PAGE_KEY = 'page_' + location.pathname.replace(/[^a-z]/gi, '_');
  var UNSPLASH_API = 'https://api.unsplash.com/search/photos';

  function isIn() { return sessionStorage.getItem('sok') === '1'; }
  function load() { try { return JSON.parse(localStorage.getItem(PAGE_KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { localStorage.setItem(PAGE_KEY, JSON.stringify(d)); }
  function getKey() { return localStorage.getItem('ukey') || ''; }

  /* 悬浮登录按钮（未登录时显示） */
  function injectLoginBtn() {
    if (isIn()) return;
    var btn = document.createElement('a');
    btn.id = 'se-login-btn';
    btn.href = 'admin.html';
    btn.title = '管理员登录';
    btn.textContent = '🔑';
    var s = document.createElement('style');
    s.textContent = '#se-login-btn{position:fixed;bottom:24px;right:24px;z-index:9990;width:44px;height:44px;border-radius:50%;background:rgba(44,36,24,.75);color:#f5f0e8;font-size:1.2rem;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,.25);transition:all .2s;cursor:pointer;}#se-login-btn:hover{background:rgba(44,36,24,.95);transform:scale(1.08);}';
    document.head.appendChild(s);
    document.body.appendChild(btn);
  }

  /* 内容恢复 */
  function restore() {
    var d = load();
    Object.keys(d).forEach(function (id) {
      if (id === '__gallery' || id === '__writings') return;
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'IMG') el.src = d[id]; else el.innerHTML = d[id];
    });
    if (d.__gallery) renderGallery(JSON.parse(d.__gallery));
    if (d.__writings) renderWritings(JSON.parse(d.__writings));
  }

  /* 相册 */
  var _gallery = [];
  function renderGallery(items) {
    _gallery = items || [];
    var grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';
    _gallery.forEach(function (item, i) {
      var div = document.createElement('div');
      div.className = 'gallery-item fade-in visible';
      div.dataset.category = item.cat || 'daily';
      div.dataset.idx = i;
      if (item.src) {
        div.innerHTML = '<img src="' + item.src + '" alt="' + (item.title || '') + '" loading="lazy">' +
          '<div class="gallery-item-overlay"><div class="gallery-item-title">' + (item.title || '') + '</div>' +
          '<div class="gallery-item-date">' + (item.date || '') + '</div></div>';
      } else {
        div.innerHTML = '<div class="photo-placeholder sq">' + (item.emoji || '🖼') + '</div>';
      }
      div.addEventListener('click', function (e) {
        if (!e.target.closest('.edit-controls') && item.src) openLightbox(item.src);
      });
      grid.appendChild(div);
    });
    var cnt = document.querySelector('.gallery-count');
    if (cnt) cnt.textContent = '共 ' + _gallery.length + ' 张 · 持续更新中';
    if (isIn()) addGalleryControls();
    bindFilters();
  }

  function addGalleryControls() {
    document.querySelectorAll('.gallery-item').forEach(function (item) {
      var i = parseInt(item.dataset.idx, 10);
      var c = document.createElement('div');
      c.className = 'edit-controls';
      c.innerHTML = '<button onclick="window.SE.editPhoto(' + i + ')">✏️</button><button onclick="window.SE.delPhoto(' + i + ')" style="color:#e07070">🗑</button>';
      item.appendChild(c);
    });
  }

  function bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.filter;
        document.querySelectorAll('.gallery-item').forEach(function (item) {
          item.style.display = (f === 'all' || item.dataset.category === f) ? '' : 'none';
        });
      });
    });
  }

  function openLightbox(src) {
    var lb = document.getElementById('lightbox');
    var li = document.getElementById('lightbox-img');
    if (!lb || !li) return;
    li.src = src;
    lb.classList.add('open');
  }

  /* 随笔 */
  var _writings = [];
  function renderWritings(items) {
    _writings = items || [];
    var list = document.querySelector('.writings-list');
    if (!list) return;
    list.innerHTML = '';
    _writings.forEach(function (w, i) {
      var div = document.createElement('div');
      div.className = 'writing-item fade-in visible';
      div.innerHTML = '<div class="writing-meta"><span class="writing-date">' + (w.date || '') + '</span><span class="writing-tag">' + (w.tag || '') + '</span></div>' +
        '<h2 class="writing-title">' + (w.title || '') + '</h2>' +
        '<p class="writing-excerpt">' + (w.excerpt || '') + '</p>' +
        (w.body ? '<a class="writing-read-more" onclick="window.SE.openArticle(' + i + ')">继续读 →</a>' : '');
      list.appendChild(div);
    });
    if (isIn()) {
      document.querySelectorAll('.writing-item').forEach(function (item, i) {
        var c = document.createElement('div');
        c.className = 'edit-controls';
        c.style.marginTop = '12px';
        c.innerHTML = '<button onclick="window.SE.editWriting(' + i + ')">✏️ 编辑</button><button onclick="window.SE.delWriting(' + i + ')" style="color:#e07070">🗑 删除</button>';
        item.appendChild(c);
      });
    }
  }

  function openArticle(idx) {
    var w = _writings[idx];
    if (!w) return;
    var modal = document.getElementById('article-modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = w.title || '';
    document.getElementById('modal-meta').textContent = (w.date || '') + (w.tag ? ' · ' + w.tag : '');
    document.getElementById('modal-body').innerHTML = w.body || '';
    modal.classList.add('open');
    window.scrollTo(0, 0);
  }

  /* 编辑工具栏 */
  function injectBar() {
    var bar = document.createElement('div');
    bar.id = 'ed-bar';
    var isG = !!document.querySelector('.gallery-grid');
    var isW = !!document.querySelector('.writings-list');
    bar.innerHTML = '<span id="ed-label">✏️ 编辑模式</span><div id="ed-actions">' +
      '<button class="eb save" onclick="window.SE.saveAll()">💾 保存</button>' +
      (isG ? '<button class="eb" onclick="window.SE.addPhoto()">＋ 添加图片</button><button class="eb" onclick="window.SE.unsplashSearch()">🔍 Unsplash</button>' : '') +
      (isW ? '<button class="eb" onclick="window.SE.addWriting()">＋ 新增随笔</button>' : '') +
      '<a class="eb exit" href="admin.html">退出编辑</a></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    var s = document.createElement('style');
    s.textContent = '#ed-bar{position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:46px;background:#2c2418;color:#f5f0e8;box-shadow:0 2px 12px rgba(0,0,0,.3);}#ed-label{font-size:.82rem;letter-spacing:.1em;}#ed-actions{display:flex;gap:8px;align-items:center;}.eb{padding:5px 13px;border-radius:2px;border:1px solid rgba(245,240,232,.25);background:transparent;color:#f5f0e8;font-size:.76rem;cursor:pointer;letter-spacing:.06em;text-decoration:none;font-family:inherit;transition:background .2s;}.eb:hover{background:rgba(245,240,232,.15);}.eb.save{background:rgba(80,160,80,.25);border-color:rgba(80,160,80,.5);}.eb.exit{background:rgba(160,80,80,.2);border-color:rgba(160,80,80,.4);}body{padding-top:46px!important;}nav{top:46px!important;}[data-ed]:hover{outline:2px dashed rgba(180,140,80,.6);outline-offset:2px;cursor:text;}[data-ed]:focus{outline:2px solid rgba(180,140,80,.9);background:rgba(255,250,230,.35);}.edit-controls{display:flex;gap:6px;margin-top:6px;}.edit-controls button{padding:3px 10px;background:rgba(44,36,24,.75);color:#f5f0e8;border:none;border-radius:2px;font-size:.7rem;cursor:pointer;}.em-bg{display:none;position:fixed;inset:0;z-index:10000;background:rgba(44,36,24,.65);align-items:center;justify-content:center;}.em-bg.open{display:flex;}.em-box{background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:36px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}.em-box h3{font-family:var(--font-serif);font-size:1.3rem;font-weight:400;margin-bottom:20px;}.em-field{margin-bottom:16px;}.em-field label{display:block;font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:var(--accent-lt);margin-bottom:5px;}.em-field input,.em-field textarea,.em-field select{width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:2px;font-family:var(--font-body);font-size:.9rem;color:var(--text);outline:none;}.em-field textarea{min-height:90px;resize:vertical;}.em-actions{display:flex;gap:10px;margin-top:20px;}.em-btn{flex:1;padding:10px;border-radius:2px;border:1px solid var(--border);background:var(--text);color:var(--bg);font-family:var(--font-body);font-size:.85rem;cursor:pointer;}.em-btn.cancel{background:var(--bg-warm);color:var(--text);}.em-preview{width:100%;max-height:180px;object-fit:cover;border-radius:2px;margin-top:8px;display:none;border:1px solid var(--border);}.usp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;max-height:300px;overflow-y:auto;}.usp-img{aspect-ratio:1/1;object-fit:cover;width:100%;cursor:pointer;border-radius:2px;border:2px solid transparent;transition:all .2s;}.usp-img:hover{border-color:var(--accent);}.usp-img.selected{border-color:var(--text);}.usp-hint{text-align:center;padding:16px;color:var(--text-muted);font-size:.83rem;}';
    document.head.appendChild(s);
  }

  function makeEditable(sel, id) {
    var el = document.querySelector(sel);
    if (!el) return;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-ed', '1');
    if (!el.id) el.id = id;
  }

  function initEditable() {
    var p = location.pathname;
    if (p.endsWith('/') || p.includes('index')) {
      makeEditable('.hero-eyebrow', 'e_ey');
      makeEditable('.hero-title', 'e_ht');
      makeEditable('.hero-subtitle', 'e_hs');
      makeEditable('.home-quote blockquote', 'e_hq');
    }
    if (p.includes('about')) {
      makeEditable('.about-text h2', 'e_an');
      makeEditable('.about-subtitle', 'e_as');
      document.querySelectorAll('.about-text p').forEach(function (el, i) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-ed', '1');
        if (!el.id) el.id = 'e_ap' + i;
      });
      document.querySelectorAll('.about-detail-value').forEach(function (el, i) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-ed', '1');
        if (!el.id) el.id = 'e_dv' + i;
      });
      document.querySelectorAll('.about-ps-block').forEach(function (el, i) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-ed', '1');
        if (!el.id) el.id = 'e_ps' + i;
      });
    }
    if (p.includes('gallery')) { makeEditable('.gallery-page-header h1', 'e_gh'); }
    if (p.includes('writings')) { makeEditable('.writings-page-header h1', 'e_wh'); }
  }

  /* 模态框 */
  var _mb = null;
  function showModal(html) {
    closeModal();
    var bg = document.createElement('div');
    bg.className = 'em-bg open';
    bg.innerHTML = '<div class="em-box">' + html + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) closeModal(); });
    document.body.appendChild(bg);
    _mb = bg;
  }
  function closeModal() { if (_mb) { _mb.remove(); _mb = null; } }

  /* 图片上传 */
  var _curSrc = '';
  function bindUpload(fid, pid) {
    var inp = document.getElementById(fid);
    if (!inp) return;
    inp.addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        _curSrc = e.target.result;
        var pv = document.getElementById(pid);
        if (pv) { pv.src = e.target.result; pv.style.display = 'block'; }
      };
      r.readAsDataURL(f);
    });
  }

  /* Unsplash */
  var _uspSel = '', _curPhotoIdx = -1;
  function unsplashSearch() {
    showModal('<h3>🔍 从 Unsplash 选取图片</h3>' +
      '<div style="display:flex;gap:8px"><div class="em-field" style="flex:1;margin:0"><label>关键词（英文效果更好）</label><input type="text" id="uq" placeholder="nature, city, travel…"/></div>' +
      '<button class="em-btn" style="margin-top:auto;flex:0 0 80px;padding:9px 0" onclick="window.SE._uSearch()">搜索</button></div>' +
      '<p class="usp-hint" id="usp-hint">输入关键词后点击搜索</p><div class="usp-grid" id="usp-grid"></div>' +
      '<div class="em-field" style="margin-top:12px"><label>或直接粘贴图片 URL</label><input type="text" id="eu-url" placeholder="https://…"/></div>' +
      '<div class="em-field"><label>标题</label><input type="text" id="eu-title"/></div>' +
      '<div class="em-field"><label>日期/说明</label><input type="text" id="eu-date" placeholder="2024 · 旅行"/></div>' +
      '<div class="em-field"><label>分类</label><select id="eu-cat"><option value="travel">旅行</option><option value="daily">日常</option><option value="nature">自然</option></select></div>' +
      '<div class="em-actions"><button class="em-btn cancel" onclick="window.SE.closeModal()">取消</button><button class="em-btn" onclick="window.SE._uConfirm()">添加到相册</button></div>');
    _uspSel = '';
  }

  function _uSearch() {
    var q = document.getElementById('uq').value.trim();
    if (!q) return;
    var key = getKey();
    var grid = document.getElementById('usp-grid');
    var hint = document.getElementById('usp-hint');
    grid.innerHTML = '';
    hint.textContent = '搜索中…';
    _uspSel = '';
    if (!key) {
      hint.textContent = '未设置 API Key，显示随机图片（去管理中心设置 Key 开启搜索）：';
      for (var i = 0; i < 9; i++) {
        appendUImg(grid, 'https://source.unsplash.com/300x300/?' + encodeURIComponent(q) + '&sig=' + Date.now() + i, '',
          'https://source.unsplash.com/800x600/?' + encodeURIComponent(q) + '&sig=' + Date.now() + i);
      }
      return;
    }
    fetch(UNSPLASH_API + '?query=' + encodeURIComponent(q) + '&per_page=12&client_id=' + key)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hint.textContent = data.results && data.results.length ? '' : '没有找到相关图片';
        (data.results || []).forEach(function (p) { appendUImg(grid, p.urls.small, p.alt_description || '', p.urls.regular); });
      })
      .catch(function () { hint.textContent = 'API 请求失败，请检查 Key'; });
  }

  function appendUImg(grid, thumb, alt, full) {
    var img = document.createElement('img');
    img.className = 'usp-img';
    img.src = thumb;
    img.alt = alt;
    img.dataset.full = full || thumb;
    img.addEventListener('click', function () {
      document.querySelectorAll('.usp-img').forEach(function (x) { x.classList.remove('selected'); });
      img.classList.add('selected');
      _uspSel = img.dataset.full;
      var ui = document.getElementById('eu-url');
      if (ui) ui.value = _uspSel;
    });
    grid.appendChild(img);
  }

  function _uConfirm() {
    var src = _uspSel || (document.getElementById('eu-url') ? document.getElementById('eu-url').value.trim() : '');
    if (!src) { alert('请先选择图片或输入 URL'); return; }
    _gallery.push({
      src: src,
      title: document.getElementById('eu-title').value || '新照片',
      date: document.getElementById('eu-date').value || '2024',
      cat: document.getElementById('eu-cat').value || 'daily'
    });
    renderGallery(_gallery);
    closeModal();
  }

  /* 添加/编辑照片 */
  function addPhoto() {
    _curPhotoIdx = -1; _curSrc = '';
    showModal(photoForm('添加照片', {}));
    setTimeout(function () { bindUpload('ep-f', 'ep-pv'); }, 100);
  }

  function editPhoto(idx) {
    _curPhotoIdx = idx;
    _curSrc = _gallery[idx] ? _gallery[idx].src : '';
    showModal(photoForm('编辑照片', _gallery[idx] || {}));
    setTimeout(function () {
      bindUpload('ep-f', 'ep-pv');
      var pv = document.getElementById('ep-pv');
      if (pv && _curSrc) { pv.src = _curSrc; pv.style.display = 'block'; }
    }, 100);
  }

  function photoForm(title, item) {
    return '<h3>' + title + '</h3>' +
      '<div class="em-field"><label>上传图片文件</label><input type="file" id="ep-f" accept="image/*"/><img id="ep-pv" class="em-preview"/></div>' +
      '<div class="em-field"><label>或输入图片 URL</label><input type="text" id="ep-u" value="' + (item.src || '') + '" placeholder="https://…"/></div>' +
      '<div class="em-field"><label>标题</label><input type="text" id="ep-t" value="' + (item.title || '') + '"/></div>' +
      '<div class="em-field"><label>日期/说明</label><input type="text" id="ep-d" value="' + (item.date || '') + '" placeholder="2024 · 旅行"/></div>' +
      '<div class="em-field"><label>分类</label><select id="ep-c"><option value="travel"' + (item.cat === 'travel' ? ' selected' : '') + '>旅行</option><option value="daily"' + (item.cat === 'daily' || !item.cat ? ' selected' : '') + '>日常</option><option value="nature"' + (item.cat === 'nature' ? ' selected' : '') + '>自然</option></select></div>' +
      '<div class="em-actions"><button class="em-btn cancel" onclick="window.SE.closeModal()">取消</button><button class="em-btn" onclick="window.SE.confirmPhoto()">保存</button></div>';
  }

  function confirmPhoto() {
    var urlEl = document.getElementById('ep-u');
    var src = _curSrc || (urlEl ? urlEl.value.trim() : '');
    if (!src) { alert('请选择图片文件或输入 URL'); return; }
    var item = {
      src: src,
      title: (document.getElementById('ep-t') || {}).value || '',
      date: (document.getElementById('ep-d') || {}).value || '',
      cat: (document.getElementById('ep-c') || {}).value || 'daily'
    };
    if (_curPhotoIdx >= 0) _gallery[_curPhotoIdx] = item;
    else _gallery.push(item);
    _curSrc = '';
    renderGallery(_gallery);
    closeModal();
  }

  function delPhoto(idx) {
    if (!confirm('确定删除这张照片？')) return;
    _gallery.splice(idx, 1);
    renderGallery(_gallery);
  }

  /* 随笔 */
  var _curWIdx = -1;
  function loadWritingsData() {
    var d = load();
    if (d.__writings) {
      try { _writings = JSON.parse(d.__writings); } catch (e) { _writings = []; }
    } else {
      _writings = [];
      document.querySelectorAll('.writing-item').forEach(function (el) {
        _writings.push({
          title: (el.querySelector('.writing-title') || { textContent: '' }).textContent.trim(),
          date: (el.querySelector('.writing-date') || { textContent: '' }).textContent.trim(),
          tag: (el.querySelector('.writing-tag') || { textContent: '' }).textContent.trim(),
          excerpt: (el.querySelector('.writing-excerpt') || { textContent: '' }).textContent.trim(),
          body: ''
        });
      });
    }
  }

  function addWriting() { _curWIdx = -1; showModal(writingForm('新增随笔', {})); }
  function editWriting(idx) { _curWIdx = idx; showModal(writingForm('编辑随笔', _writings[idx] || {})); }

  function writingForm(title, w) {
    var body = (w.body || '').replace(/<p>/g, '').replace(/<\/p>/g, '\n').trim();
    return '<h3>' + title + '</h3>' +
      '<div class="em-field"><label>标题</label><input type="text" id="ew-t" value="' + (w.title || '') + '"/></div>' +
      '<div class="em-field"><label>日期</label><input type="text" id="ew-d" value="' + (w.date || '') + '" placeholder="2024 年 12 月 1 日"/></div>' +
      '<div class="em-field"><label>标签</label><input type="text" id="ew-g" value="' + (w.tag || '') + '" placeholder="日常"/></div>' +
      '<div class="em-field"><label>摘要</label><textarea id="ew-e">' + (w.excerpt || '') + '</textarea></div>' +
      '<div class="em-field"><label>正文（每行为一段）</label><textarea id="ew-b" style="min-height:140px">' + body + '</textarea></div>' +
      '<div class="em-actions"><button class="em-btn cancel" onclick="window.SE.closeModal()">取消</button><button class="em-btn" onclick="window.SE.confirmWriting()">保存</button></div>';
  }

  function confirmWriting() {
    var t = (document.getElementById('ew-t') || {}).value;
    if (!t || !t.trim()) { alert('请输入标题'); return; }
    var body = ((document.getElementById('ew-b') || {}).value || '').split('\n').map(function (l) { return l.trim() ? '<p>' + l + '</p>' : ''; }).join('');
    var item = {
      title: t.trim(),
      date: ((document.getElementById('ew-d') || {}).value || ''),
      tag: ((document.getElementById('ew-g') || {}).value || ''),
      excerpt: ((document.getElementById('ew-e') || {}).value || ''),
      body: body
    };
    if (_curWIdx >= 0) _writings[_curWIdx] = item;
    else _writings.unshift(item);
    renderWritings(_writings);
    closeModal();
  }

  function delWriting(idx) {
    if (!confirm('确定删除？')) return;
    _writings.splice(idx, 1);
    renderWritings(_writings);
  }

  /* 保存 */
  function saveAll() {
    var d = load();
    document.querySelectorAll('[data-ed]').forEach(function (el) {
      if (el.id) d[el.id] = el.innerHTML;
    });
    if (document.querySelector('.gallery-grid')) d.__gallery = JSON.stringify(_gallery);
    if (document.querySelector('.writings-list')) d.__writings = JSON.stringify(_writings);
    save(d);
    var btn = document.querySelector('.eb.save');
    if (btn) { var o = btn.textContent; btn.textContent = '✅ 已保存'; setTimeout(function () { btn.textContent = o; }, 2000); }
  }

  /* 全局 */
  window.SE = {
    saveAll: saveAll, addPhoto: addPhoto, editPhoto: editPhoto, delPhoto: delPhoto,
    confirmPhoto: confirmPhoto, unsplashSearch: unsplashSearch, _uSearch: _uSearch,
    _uConfirm: _uConfirm, addWriting: addWriting, editWriting: editWriting, delWriting: delWriting,
    confirmWriting: confirmWriting, openArticle: openArticle, closeModal: closeModal
  };

  /* 启动 */
  document.addEventListener('DOMContentLoaded', function () {
    restore();
    if (!isIn()) {
      injectLoginBtn();
      return;
    }
    injectBar();
    initEditable();
    if (document.querySelector('.gallery-grid')) { loadGallery(); renderGallery(_gallery); }
    if (document.querySelector('.writings-list')) { loadWritingsData(); renderWritings(_writings); }
  });

  function loadGallery() {
    var d = load();
    if (d.__gallery) {
      try { _gallery = JSON.parse(d.__gallery); } catch (e) { _gallery = []; }
    } else {
      _gallery = [];
      document.querySelectorAll('.gallery-item').forEach(function (el) {
        var img = el.querySelector('img');
        var t = el.querySelector('.gallery-item-title');
        var dt = el.querySelector('.gallery-item-date');
        _gallery.push({ src: img ? img.src : '', title: t ? t.textContent.trim() : '', date: dt ? dt.textContent.trim() : '', cat: el.dataset.category || 'daily' });
      });
    }
  }
})();
