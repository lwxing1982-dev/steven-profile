/**
 * editor.js — 网站内容编辑器
 * 登录验证 + 可视化编辑（文字 & 图片），内容存储于 localStorage
 */

(function() {
  'use strict';

  // ── 1. 工具函数 ──────────────────────────────────────────
  var PAGE_KEY = 'site_page_' + location.pathname.replace(/\//g, '_');

  function isLoggedIn() {
    return sessionStorage.getItem('site_logged_in') === '1';
  }

  function savePageData(data) {
    localStorage.setItem(PAGE_KEY, JSON.stringify(data));
  }

  function loadPageData() {
    try { return JSON.parse(localStorage.getItem(PAGE_KEY)) || {}; }
    catch(e) { return {}; }
  }

  // ── 2. 内容恢复（无论是否登录都执行）──────────────────────
  function restoreContent() {
    var data = loadPageData();
    Object.keys(data).forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      var val = data[id];
      if (el.tagName === 'IMG') {
        el.src = val;
      } else {
        el.innerHTML = val;
      }
    });
    // 恢复相册图片
    if (data.__gallery) {
      try {
        var items = JSON.parse(data.__gallery);
        renderGallery(items);
      } catch(e) {}
    }
    // 恢复随笔
    if (data.__writings) {
      try {
        var writings = JSON.parse(data.__writings);
        renderWritings(writings);
      } catch(e) {}
    }
  }

  // ── 3. 相册渲染 ───────────────────────────────────────────
  function renderGallery(items) {
    var grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';
    items.forEach(function(item, idx) {
      var div = document.createElement('div');
      div.className = 'gallery-item fade-in visible';
      div.dataset.category = item.category || 'daily';
      div.dataset.gidx = idx;
      if (item.src) {
        div.innerHTML =
          '<img src="' + item.src + '" style="width:100%;display:block;object-fit:cover;aspect-ratio:' + (item.ratio||'1/1') + '">' +
          '<div class="gallery-item-overlay">' +
          '<div class="gallery-item-title" id="gtitle_' + idx + '">' + (item.title||'') + '</div>' +
          '<div class="gallery-item-date" id="gdate_' + idx + '">' + (item.date||'') + '</div>' +
          '</div>';
      }
      grid.appendChild(div);
    });
  }

  // ── 4. 随笔渲染 ───────────────────────────────────────────
  function renderWritings(writings) {
    var list = document.querySelector('.writings-list');
    if (!list) return;
    list.innerHTML = '';
    writings.forEach(function(w, idx) {
      var div = document.createElement('div');
      div.className = 'writing-item fade-in visible';
      div.innerHTML =
        '<div class="writing-meta">' +
        '<span class="writing-date" id="wdate_' + idx + '">' + (w.date||'') + '</span>' +
        '<span class="writing-tag" id="wtag_' + idx + '">' + (w.tag||'') + '</span>' +
        '</div>' +
        '<h2 class="writing-title" id="wtitle_' + idx + '">' + (w.title||'') + '</h2>' +
        '<p class="writing-excerpt" id="wexcerpt_' + idx + '">' + (w.excerpt||'') + '</p>' +
        '<div class="writing-body" id="wbody_' + idx + '" style="display:none">' + (w.body||'') + '</div>';
      list.appendChild(div);
    });
  }

  // ── 5. 编辑器 UI ──────────────────────────────────────────
  function injectEditorBar() {
    // 顶部编辑工具栏
    var bar = document.createElement('div');
    bar.id = 'editor-bar';
    bar.innerHTML = `
      <div id="editor-bar-inner">
        <span id="editor-bar-title">✏️ 编辑模式</span>
        <div id="editor-bar-actions">
          <button onclick="window.__editor.saveAll()" class="ebar-btn ebar-save">💾 保存</button>
          <button onclick="window.__editor.addGalleryItem()" class="ebar-btn" id="btn-add-photo" style="display:none">＋ 添加图片</button>
          <button onclick="window.__editor.addWriting()" class="ebar-btn" id="btn-add-writing" style="display:none">＋ 添加随笔</button>
          <a href="admin.html" class="ebar-btn ebar-exit">退出编辑</a>
        </div>
      </div>
    `;
    document.body.insertBefore(bar, document.body.firstChild);

    // 编辑器样式
    var style = document.createElement('style');
    style.textContent = `
      #editor-bar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: #2c2418; color: #f5f0e8;
        padding: 0 24px; height: 48px;
        display: flex; align-items: center;
        box-shadow: 0 2px 12px rgba(0,0,0,.25);
      }
      #editor-bar-inner {
        display: flex; align-items: center;
        justify-content: space-between; width: 100%;
      }
      #editor-bar-title { font-size:.85rem; letter-spacing:.1em; }
      #editor-bar-actions { display:flex; gap:10px; align-items:center; }
      .ebar-btn {
        padding: 6px 14px; border-radius:2px; border:1px solid rgba(245,240,232,.25);
        background:transparent; color:#f5f0e8; font-size:.78rem; cursor:pointer;
        letter-spacing:.08em; text-decoration:none; font-family:inherit;
        transition: background .2s;
      }
      .ebar-btn:hover { background: rgba(245,240,232,.15); }
      .ebar-save { background: rgba(100,180,100,.25); border-color:rgba(100,180,100,.5); }
      .ebar-exit { background: rgba(180,80,80,.2); border-color:rgba(180,80,80,.4); }
      body { padding-top: 48px !important; }
      nav { top: 48px !important; }
      /* 可编辑元素高亮 */
      [data-editable]:hover {
        outline: 2px dashed rgba(180,140,80,.6);
        outline-offset: 2px;
        cursor: text;
      }
      [data-editable]:focus {
        outline: 2px solid rgba(180,140,80,.9);
        outline-offset: 2px;
        background: rgba(255,250,235,.4);
      }
      /* 相册编辑覆盖 */
      .gallery-item { position: relative; }
      .gallery-edit-overlay {
        position: absolute; top:6px; right:6px; z-index:10;
        display:flex; gap:6px;
      }
      .gallery-edit-btn {
        background: rgba(44,36,24,.8); color:#f5f0e8;
        border:none; border-radius:2px; padding:4px 8px;
        font-size:.72rem; cursor:pointer;
      }
      /* 随笔编辑按钮 */
      .writing-edit-btn {
        display:inline-block; margin-left:12px;
        background:var(--bg-warm); border:1px solid var(--border);
        border-radius:2px; padding:3px 10px; font-size:.75rem;
        cursor:pointer; color:var(--text-muted);
      }
      /* 图片上传区 */
      .img-upload-area {
        width:100%; aspect-ratio:1/1;
        border:2px dashed rgba(150,130,100,.4);
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        cursor:pointer; background:var(--bg-warm);
        color:var(--text-muted); font-size:.85rem;
        transition: border-color .2s;
      }
      .img-upload-area:hover { border-color:rgba(150,130,100,.8); }
      /* 模态框 */
      .editor-modal-bg {
        display:none; position:fixed; inset:0; z-index:10000;
        background: rgba(44,36,24,.7); align-items:center; justify-content:center;
      }
      .editor-modal-bg.open { display:flex; }
      .editor-modal {
        background:var(--bg-card); border:1px solid var(--border);
        border-radius:4px; padding:40px; width:100%; max-width:520px;
        max-height:85vh; overflow-y:auto;
      }
      .editor-modal h3 { font-family:var(--font-serif); font-size:1.3rem; font-weight:400; margin-bottom:24px; }
      .editor-field { margin-bottom:18px; }
      .editor-field label { display:block; font-size:.75rem; letter-spacing:.12em; text-transform:uppercase; color:var(--accent-lt); margin-bottom:6px; }
      .editor-field input, .editor-field textarea, .editor-field select {
        width:100%; padding:10px 14px; background:var(--bg);
        border:1px solid var(--border); border-radius:2px;
        font-family:var(--font-body); font-size:.9rem; color:var(--text); outline:none;
      }
      .editor-field textarea { min-height:100px; resize:vertical; }
      .editor-field input:focus, .editor-field textarea:focus { border-color:var(--accent); }
      .editor-modal-actions { display:flex; gap:12px; margin-top:24px; }
      .em-btn {
        flex:1; padding:10px; border-radius:2px; border:1px solid var(--border);
        background:var(--text); color:var(--bg); font-family:var(--font-body);
        font-size:.85rem; cursor:pointer;
      }
      .em-btn.cancel { background:var(--bg-warm); color:var(--text); }
      .em-img-preview { width:100%; max-height:200px; object-fit:cover; margin-top:10px; border-radius:2px; display:none; }
    `;
    document.head.appendChild(style);

    // 检测当前页面类型，显示对应按钮
    if (document.querySelector('.gallery-grid')) {
      document.getElementById('btn-add-photo').style.display = 'inline-block';
    }
    if (document.querySelector('.writings-list')) {
      document.getElementById('btn-add-writing').style.display = 'inline-block';
    }
  }

  function makeEditable(selector, id) {
    var el = document.querySelector(selector) || document.getElementById(id);
    if (!el) return;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-editable', '1');
    if (!el.id) el.id = id;
  }

  // ── 6. 编辑器主逻辑 ───────────────────────────────────────
  var galleryItems = [];
  var writingsData = [];

  function initEditableFields() {
    var page = location.pathname;

    if (page.indexOf('index') !== -1 || page.endsWith('/') || page.endsWith('steven-profile/')) {
      // 首页可编辑字段
      makeEditable('.hero-eyebrow', 'edit-eyebrow');
      makeEditable('.hero-title', 'edit-hero-title');
      makeEditable('.hero-subtitle', 'edit-hero-subtitle');
      makeEditable('.home-quote blockquote', 'edit-quote');
    }

    if (page.indexOf('about') !== -1) {
      makeEditable('.about-text h2', 'edit-about-name');
      makeEditable('.about-subtitle', 'edit-about-subtitle');
      makeEditable('.about-ps-block:nth-child(1)', 'edit-ps1');
      makeEditable('.about-ps-block:nth-child(2)', 'edit-ps2');
      makeEditable('.about-ps-block:nth-child(3)', 'edit-ps3');
      // 关于页个人信息
      document.querySelectorAll('.about-text p').forEach(function(p, i) {
        p.setAttribute('contenteditable', 'true');
        p.setAttribute('data-editable', '1');
        if (!p.id) p.id = 'edit-about-p' + i;
      });
      document.querySelectorAll('.about-detail-value').forEach(function(v, i) {
        v.setAttribute('contenteditable', 'true');
        v.setAttribute('data-editable', '1');
        if (!v.id) v.id = 'edit-detail-v' + i;
      });
    }

    if (page.indexOf('gallery') !== -1) {
      initGalleryEdit();
    }

    if (page.indexOf('writings') !== -1) {
      initWritingsEdit();
    }
  }

  // ── 7. 相册编辑 ───────────────────────────────────────────
  function loadGalleryItems() {
    var data = loadPageData();
    if (data.__gallery) {
      try { galleryItems = JSON.parse(data.__gallery); } catch(e) { galleryItems = []; }
    } else {
      // 读取现有 DOM 中的图片/占位
      var items = document.querySelectorAll('.gallery-item');
      galleryItems = [];
      items.forEach(function(item) {
        var img = item.querySelector('img');
        var title = item.querySelector('.gallery-item-title');
        var date = item.querySelector('.gallery-item-date');
        galleryItems.push({
          src: img ? img.src : '',
          title: title ? title.textContent : '',
          date: date ? date.textContent : '',
          category: item.dataset.category || 'daily',
          ratio: '1/1'
        });
      });
    }
  }

  function initGalleryEdit() {
    loadGalleryItems();
    renderGallery(galleryItems);
    addGalleryEditButtons();
  }

  function addGalleryEditButtons() {
    document.querySelectorAll('.gallery-item').forEach(function(item, idx) {
      var ov = document.createElement('div');
      ov.className = 'gallery-edit-overlay';
      ov.innerHTML =
        '<button class="gallery-edit-btn" onclick="window.__editor.editGalleryItem(' + idx + ')">✏️ 编辑</button>' +
        '<button class="gallery-edit-btn" style="background:rgba(180,60,60,.8)" onclick="window.__editor.deleteGalleryItem(' + idx + ')">🗑 删除</button>';
      item.appendChild(ov);
    });
  }

  // ── 8. 随笔编辑 ───────────────────────────────────────────
  function loadWritingsData() {
    var data = loadPageData();
    if (data.__writings) {
      try { writingsData = JSON.parse(data.__writings); } catch(e) { writingsData = []; }
    } else {
      var items = document.querySelectorAll('.writing-item');
      writingsData = [];
      items.forEach(function(item) {
        var titleEl = item.querySelector('.writing-title');
        var dateEl = item.querySelector('.writing-date');
        var tagEl = item.querySelector('.writing-tag');
        var excerptEl = item.querySelector('.writing-excerpt');
        writingsData.push({
          title: titleEl ? titleEl.textContent.trim() : '',
          date: dateEl ? dateEl.textContent.trim() : '',
          tag: tagEl ? tagEl.textContent.trim() : '',
          excerpt: excerptEl ? excerptEl.textContent.trim() : '',
          body: ''
        });
      });
    }
  }

  function initWritingsEdit() {
    loadWritingsData();
    renderWritings(writingsData);
    addWritingEditButtons();
  }

  function addWritingEditButtons() {
    document.querySelectorAll('.writing-item').forEach(function(item, idx) {
      var h2 = item.querySelector('.writing-title');
      if (h2) {
        var btn = document.createElement('span');
        btn.className = 'writing-edit-btn';
        btn.textContent = '编辑';
        btn.onclick = function() { window.__editor.editWriting(idx); };
        h2.appendChild(btn);
      }
      var delBtn = document.createElement('span');
      delBtn.className = 'writing-edit-btn';
      delBtn.style.color = '#b94040';
      delBtn.textContent = '删除';
      delBtn.onclick = function() { window.__editor.deleteWriting(idx); };
      item.appendChild(delBtn);
    });
  }

  // ── 9. 模态框 ─────────────────────────────────────────────
  function createModal(html) {
    var bg = document.createElement('div');
    bg.className = 'editor-modal-bg open';
    bg.innerHTML = '<div class="editor-modal">' + html + '</div>';
    bg.addEventListener('click', function(e) { if(e.target === bg) closeModal(); });
    document.body.appendChild(bg);
    window.__currentModal = bg;
  }

  function closeModal() {
    if (window.__currentModal) {
      window.__currentModal.remove();
      window.__currentModal = null;
    }
  }

  // ── 10. 图片上传辅助 ──────────────────────────────────────
  function readFileAsDataURL(file, cb) {
    var reader = new FileReader();
    reader.onload = function(e) { cb(e.target.result); };
    reader.readAsDataURL(file);
  }

  function setupImageUpload(inputId, previewId) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    if (!input || !preview) return;
    input.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      readFileAsDataURL(file, function(src) {
        preview.src = src;
        preview.style.display = 'block';
        preview.dataset.src = src;
      });
    });
  }

  // ── 11. 全局编辑器对象 ────────────────────────────────────
  window.__editor = {

    saveAll: function() {
      var data = loadPageData();

      // 保存可编辑文字字段
      document.querySelectorAll('[data-editable]').forEach(function(el) {
        if (el.id) data[el.id] = el.innerHTML;
      });

      // 保存相册
      if (document.querySelector('.gallery-grid')) {
        data.__gallery = JSON.stringify(galleryItems);
      }

      // 保存随笔
      if (document.querySelector('.writings-list')) {
        data.__writings = JSON.stringify(writingsData);
      }

      savePageData(data);

      // 保存提示
      var btn = document.querySelector('.ebar-save');
      var orig = btn.textContent;
      btn.textContent = '✅ 已保存';
      setTimeout(function() { btn.textContent = orig; }, 2000);
    },

    addGalleryItem: function() {
      createModal(`
        <h3>添加照片</h3>
        <div class="editor-field">
          <label>上传图片</label>
          <input type="file" id="em-img-file" accept="image/*">
          <img id="em-img-preview" class="em-img-preview">
        </div>
        <div class="editor-field">
          <label>标题</label>
          <input type="text" id="em-img-title" placeholder="照片标题">
        </div>
        <div class="editor-field">
          <label>日期/说明</label>
          <input type="text" id="em-img-date" placeholder="2024 · 旅行">
        </div>
        <div class="editor-field">
          <label>分类</label>
          <select id="em-img-cat">
            <option value="all">全部</option>
            <option value="travel">旅行</option>
            <option value="daily">日常</option>
            <option value="nature">自然</option>
          </select>
        </div>
        <div class="editor-modal-actions">
          <button class="em-btn cancel" onclick="window.__editor.closeModal()">取消</button>
          <button class="em-btn" onclick="window.__editor.confirmAddGallery()">添加</button>
        </div>
      `);
      setupImageUpload('em-img-file', 'em-img-preview');
    },

    confirmAddGallery: function() {
      var preview = document.getElementById('em-img-preview');
      var src = preview && preview.dataset.src ? preview.dataset.src : '';
      if (!src) { alert('请先选择图片'); return; }
      var item = {
        src: src,
        title: document.getElementById('em-img-title').value || '新照片',
        date: document.getElementById('em-img-date').value || '2024',
        category: document.getElementById('em-img-cat').value || 'daily',
        ratio: '1/1'
      };
      galleryItems.push(item);
      renderGallery(galleryItems);
      addGalleryEditButtons();
      closeModal();
    },

    editGalleryItem: function(idx) {
      var item = galleryItems[idx];
      createModal(`
        <h3>编辑照片</h3>
        <div class="editor-field">
          <label>替换图片（留空保持原图）</label>
          <input type="file" id="em-img-file" accept="image/*">
          <img id="em-img-preview" class="em-img-preview" src="` + (item.src||'') + `" style="` + (item.src?'display:block':'') + `">
        </div>
        <div class="editor-field">
          <label>标题</label>
          <input type="text" id="em-img-title" value="` + (item.title||'') + `">
        </div>
        <div class="editor-field">
          <label>日期/说明</label>
          <input type="text" id="em-img-date" value="` + (item.date||'') + `">
        </div>
        <div class="editor-field">
          <label>分类</label>
          <select id="em-img-cat">
            <option value="travel" ` + (item.category==='travel'?'selected':'') + `>旅行</option>
            <option value="daily" ` + (item.category==='daily'?'selected':'') + `>日常</option>
            <option value="nature" ` + (item.category==='nature'?'selected':'') + `>自然</option>
          </select>
        </div>
        <div class="editor-modal-actions">
          <button class="em-btn cancel" onclick="window.__editor.closeModal()">取消</button>
          <button class="em-btn" onclick="window.__editor.confirmEditGallery(` + idx + `)">保存</button>
        </div>
      `);
      setupImageUpload('em-img-file', 'em-img-preview');
    },

    confirmEditGallery: function(idx) {
      var preview = document.getElementById('em-img-preview');
      if (preview && preview.dataset.src) galleryItems[idx].src = preview.dataset.src;
      galleryItems[idx].title = document.getElementById('em-img-title').value;
      galleryItems[idx].date = document.getElementById('em-img-date').value;
      galleryItems[idx].category = document.getElementById('em-img-cat').value;
      renderGallery(galleryItems);
      addGalleryEditButtons();
      closeModal();
    },

    deleteGalleryItem: function(idx) {
      if (!confirm('确定删除这张照片？')) return;
      galleryItems.splice(idx, 1);
      renderGallery(galleryItems);
      addGalleryEditButtons();
    },

    addWriting: function() {
      createModal(`
        <h3>新增随笔</h3>
        <div class="editor-field">
          <label>标题</label>
          <input type="text" id="em-w-title" placeholder="随笔标题">
        </div>
        <div class="editor-field">
          <label>日期</label>
          <input type="text" id="em-w-date" placeholder="2024 年 12 月 1 日">
        </div>
        <div class="editor-field">
          <label>标签</label>
          <input type="text" id="em-w-tag" placeholder="日常">
        </div>
        <div class="editor-field">
          <label>摘要（列表显示）</label>
          <textarea id="em-w-excerpt" placeholder="一两句话的摘要…"></textarea>
        </div>
        <div class="editor-field">
          <label>正文（可换行，支持HTML）</label>
          <textarea id="em-w-body" style="min-height:160px" placeholder="正文内容…"></textarea>
        </div>
        <div class="editor-modal-actions">
          <button class="em-btn cancel" onclick="window.__editor.closeModal()">取消</button>
          <button class="em-btn" onclick="window.__editor.confirmAddWriting()">添加</button>
        </div>
      `);
    },

    confirmAddWriting: function() {
      var title = document.getElementById('em-w-title').value;
      if (!title) { alert('请输入标题'); return; }
      writingsData.unshift({
        title: title,
        date: document.getElementById('em-w-date').value,
        tag: document.getElementById('em-w-tag').value,
        excerpt: document.getElementById('em-w-excerpt').value,
        body: document.getElementById('em-w-body').value.split('\n').map(function(l){ return l.trim() ? '<p>'+l+'</p>' : ''; }).join('')
      });
      renderWritings(writingsData);
      addWritingEditButtons();
      closeModal();
    },

    editWriting: function(idx) {
      var w = writingsData[idx];
      createModal(`
        <h3>编辑随笔</h3>
        <div class="editor-field">
          <label>标题</label>
          <input type="text" id="em-w-title" value="` + (w.title||'') + `">
        </div>
        <div class="editor-field">
          <label>日期</label>
          <input type="text" id="em-w-date" value="` + (w.date||'') + `">
        </div>
        <div class="editor-field">
          <label>标签</label>
          <input type="text" id="em-w-tag" value="` + (w.tag||'') + `">
        </div>
        <div class="editor-field">
          <label>摘要</label>
          <textarea id="em-w-excerpt">` + (w.excerpt||'') + `</textarea>
        </div>
        <div class="editor-field">
          <label>正文</label>
          <textarea id="em-w-body" style="min-height:160px">` + (w.body||'').replace(/<p>/g,'').replace(/<\/p>/g,'\n').trim() + `</textarea>
        </div>
        <div class="editor-modal-actions">
          <button class="em-btn cancel" onclick="window.__editor.closeModal()">取消</button>
          <button class="em-btn" onclick="window.__editor.confirmEditWriting(` + idx + `)">保存</button>
        </div>
      `);
    },

    confirmEditWriting: function(idx) {
      writingsData[idx].title = document.getElementById('em-w-title').value;
      writingsData[idx].date = document.getElementById('em-w-date').value;
      writingsData[idx].tag = document.getElementById('em-w-tag').value;
      writingsData[idx].excerpt = document.getElementById('em-w-excerpt').value;
      writingsData[idx].body = document.getElementById('em-w-body').value
        .split('\n').map(function(l){ return l.trim() ? '<p>'+l+'</p>' : ''; }).join('');
      renderWritings(writingsData);
      addWritingEditButtons();
      closeModal();
    },

    deleteWriting: function(idx) {
      if (!confirm('确定删除这篇随笔？')) return;
      writingsData.splice(idx, 1);
      renderWritings(writingsData);
      addWritingEditButtons();
    },

    closeModal: closeModal
  };

  // ── 12. 初始化 ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    restoreContent();
    if (isLoggedIn()) {
      injectEditorBar();
      initEditableFields();
    }
  });

})();
