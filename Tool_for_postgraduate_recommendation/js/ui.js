// ===== UI Rendering & Interaction =====

const PROGRESS_OPTIONS = ['未联系', '已发邮件待回复', '已回复沟通中', '已面试', '已确认接收', '已放弃'];
const INTEREST_OPTIONS = ['A', 'B', 'C'];
const DEFAULT_TITLES = ['教授', '副教授', '讲师', '研究员', '特任教授', '助理教授', '副研究员', '助理研究员'];
const TIER_OPTIONS = ['C9', '华五', '985', '211', '双一流', '其他'];
const EVENT_TYPE_OPTIONS = ['报名截止', '材料提交', '面试时间', '结果公布', '其他'];

function getAllTitles() {
  const advisors = getAdvisors();
  const existing = advisors.map(a => a.title).filter(Boolean);
  const merged = [...new Set([...DEFAULT_TITLES, ...existing])];
  merged.sort((a, b) => {
    const ai = DEFAULT_TITLES.indexOf(a);
    const bi = DEFAULT_TITLES.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  return merged;
}

function getCollegesBySchool(schoolId) {
  const advisors = getAdvisors();
  const colleges = advisors
    .filter(a => a.schoolId === schoolId && Array.isArray(a.college))
    .flatMap(a => a.college);
  return [...new Set(colleges)].sort();
}

function getDirectionsBySchool(schoolId) {
  const advisors = getAdvisors();
  const dirs = advisors
    .filter(a => a.schoolId === schoolId && Array.isArray(a.researchDirection))
    .flatMap(a => a.researchDirection);
  return [...new Set(dirs)].sort();
}

// ===== Interest Label =====

const INTEREST_LABELS = { A: '最想去', B: '比较想', C: '备选' };
function interestLabel(lvl) { return INTEREST_LABELS[lvl] || lvl; }

// ===== Toast =====

function showToast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制：' + text);
  }).catch(() => {
    showToast('复制失败');
  });
}

// ===== Modal =====

let modalCallback = null;

function showModal(title, bodyHtml, onSave) {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalSave').style.display = onSave ? '' : 'none';
  modalCallback = onSave;
  overlay.classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.getElementById('modalSave').style.display = '';
  modalCallback = null;
}

function modalSave() {
  if (modalCallback) modalCallback();
}

// ===== Tab Switching =====

function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName + '-tab').classList.add('active');

  // Update FAB for context
  const fab = document.getElementById('fabBtn');
  if (tabName === 'dashboard') {
    fab.onclick = addAdvisorModal;
    fab.textContent = '+';
    fab.title = '新增导师';
    fab.style.display = '';
    renderDashboard();
  } else if (tabName === 'schools') {
    fab.onclick = addSchoolModal;
    fab.textContent = '+';
    fab.title = '新增院校';
    fab.style.display = '';
    renderSchools();
  } else if (tabName === 'timeline') {
    fab.onclick = addEventModal;
    fab.textContent = '+';
    fab.title = '新增事件';
    fab.style.display = '';
    renderTimeline();
  }
}

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(+y, +m - 1, +d);
}

// ===== Debounce (for results-only updates, input survives) =====

let _dashDebounce = null;
let _tlDebounce = null;

function debounceResults() {
  clearTimeout(_dashDebounce);
  _dashDebounce = setTimeout(applyDashboardFilters, 200);
}

function debounceTimelineResults() {
  clearTimeout(_tlDebounce);
  _tlDebounce = setTimeout(applyTimelineFilters, 200);
}

// ===== Dashboard =====
// Full render: stats + filter bar + results container (called on tab switch, data mutation)
// Partial render (applyDashboardFilters): only updates #advisorResults, input survives

function renderDashboard() {
  const container = document.getElementById('dashboard-tab');
  const advisors = getAdvisors();
  const schools = getSchools();

  const aCount = advisors.filter(a => a.interestLevel === 'A').length;
  const bCount = advisors.filter(a => a.interestLevel === 'B').length;
  const cCount = advisors.filter(a => a.interestLevel === 'C').length;
  const confirmedCount = advisors.filter(a => a.progress === '已确认接收').length;
  const chattingCount = advisors.filter(a => a.progress === '已回复沟通中').length;
  const sentCount = advisors.filter(a => a.progress === '已发邮件待回复').length;

  // Preserve filter state across re-renders
  const prevInterest = document.getElementById('filterInterest')?.value || '';
  const prevProgress = document.getElementById('filterProgress')?.value || '';
  const prevSchool = document.getElementById('filterSchool')?.value || '';
  const prevTitle = document.getElementById('filterTitle')?.value || '';
  const prevSearch = document.getElementById('filterSearch')?.value || '';

  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-card lvl-a"><div class="stat-num">${aCount}</div><div class="stat-label">最想去</div></div>
      <div class="stat-card lvl-b"><div class="stat-num">${bCount}</div><div class="stat-label">比较想</div></div>
      <div class="stat-card lvl-c"><div class="stat-num">${cCount}</div><div class="stat-label">备选</div></div>
      <div class="stat-card prog-chat"><div class="stat-num">${chattingCount}</div><div class="stat-label">沟通中</div></div>
      <div class="stat-card prog-sent"><div class="stat-num">${sentCount}</div><div class="stat-label">待回复</div></div>
      <div class="stat-card prog-confirmed"><div class="stat-num">${confirmedCount}</div><div class="stat-label">已确认</div></div>
    </div>

    <div class="filters" id="filterBar">
      <select class="filter-select" id="filterInterest" onchange="applyDashboardFilters()">
        <option value="">全部意向</option>
        <option value="A">最想去</option>
        <option value="B">比较想</option>
        <option value="C">备选</option>
      </select>
      <select class="filter-select" id="filterProgress" onchange="applyDashboardFilters()">
        <option value="">全部进展</option>
        ${PROGRESS_OPTIONS.map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
      <select class="filter-select" id="filterSchool" onchange="applyDashboardFilters()">
        <option value="">全部院校</option>
        ${schools.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
      </select>
      <select class="filter-select" id="filterTitle" onchange="applyDashboardFilters()">
        <option value="">全部职称</option>
        ${getAllTitles().map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <input class="filter-input" id="filterSearch" type="text" placeholder="搜索姓名、学院、职称、院校、研究方向..." oninput="debounceResults()">
      <button class="btn btn-primary" onclick="applyDashboardFilters()">筛选</button>
      <button class="btn" onclick="clearFilters()">重置</button>
    </div>

    <div id="advisorResults"></div>
  `;

  // Restore previous filter selections
  if (prevInterest) document.getElementById('filterInterest').value = prevInterest;
  if (prevProgress) document.getElementById('filterProgress').value = prevProgress;
  if (prevSchool) document.getElementById('filterSchool').value = prevSchool;
  if (prevTitle) document.getElementById('filterTitle').value = prevTitle;
  if (prevSearch) document.getElementById('filterSearch').value = prevSearch;

  renderAdvisorResults();
}

function renderAdvisorResults() {
  const advisors = getAdvisors();
  const schools = getSchools();
  const results = document.getElementById('advisorResults');
  if (!results) return;

  const filterInterest = document.getElementById('filterInterest')?.value || '';
  const filterProgress = document.getElementById('filterProgress')?.value || '';
  const filterSchool = document.getElementById('filterSchool')?.value || '';
  const filterTitle = document.getElementById('filterTitle')?.value || '';
  const filterSearch = document.getElementById('filterSearch')?.value || '';

  const cards = buildAdvisorCards(advisors, schools, filterInterest, filterProgress, filterSchool, filterTitle, filterSearch);
  results.innerHTML = cards
    ? `<div class="advisor-grid">${cards}</div>`
    : `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">暂无匹配的导师数据</div></div>`;
}

function applyDashboardFilters() {
  renderAdvisorResults();
}

function clearFilters() {
  const selIds = ['filterInterest', 'filterProgress', 'filterSchool', 'filterTitle'];
  selIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const searchEl = document.getElementById('filterSearch');
  if (searchEl) searchEl.value = '';
  renderAdvisorResults();
}

function buildAdvisorCards(advisors, schools, filterInterest, filterProgress, filterSchool, filterTitle, filterSearch) {
  let filtered = [...advisors];
  if (filterInterest) filtered = filtered.filter(a => a.interestLevel === filterInterest);
  if (filterProgress) filtered = filtered.filter(a => a.progress === filterProgress);
  if (filterSchool) filtered = filtered.filter(a => a.schoolId === filterSchool);
  if (filterTitle) filtered = filtered.filter(a => a.title === filterTitle);
  if (filterSearch) {
    const kw = filterSearch.toLowerCase();
    const schoolMap = {};
    schools.forEach(s => { schoolMap[s.id] = s; });
    filtered = filtered.filter(a => {
      const school = schoolMap[a.schoolId];
      return a.name.toLowerCase().includes(kw) ||
        (a.title || '').toLowerCase().includes(kw) ||
        (Array.isArray(a.college) ? a.college.some(c => c.toLowerCase().includes(kw)) : (a.college || '').toLowerCase().includes(kw)) ||
        (school && school.name.toLowerCase().includes(kw)) ||
        (a.researchDirection || []).some(d => d.toLowerCase().includes(kw)) ||
        (a.tags || []).some(t => t.toLowerCase().includes(kw)) ||
        (a.notes || '').toLowerCase().includes(kw);
    });
  }

  if (filtered.length === 0) return '';

  const schoolMap = {};
  schools.forEach(s => { schoolMap[s.id] = s; });

  return filtered.map(a => {
    const school = schoolMap[a.schoolId];
    const schoolName = school ? school.name : '未知院校';
    const collegeArr = Array.isArray(a.college) ? a.college : (a.college ? [a.college] : []);
    const collegeStr = collegeArr.length > 0 ? ' · ' + escapeHtml(collegeArr.join('、')) : '';
    return `
      <div class="advisor-card">
        <div class="card-header">
          <div>
            <div class="card-name">${escapeHtml(a.name)}</div>
            <div class="card-school">${escapeHtml(schoolName)}${collegeStr} · ${escapeHtml(a.title || '')}</div>
          </div>
          <div class="badges">
            <span class="badge badge-lvl-${a.interestLevel.toLowerCase()}">${interestLabel(a.interestLevel)}</span>
            <span class="badge badge-prog-${a.progress}">${a.progress}</span>
          </div>
        </div>
        ${(a.researchDirection && a.researchDirection.length > 0) ? `
          <div class="card-tags">
            ${a.researchDirection.map(d => `<span class="tag">${escapeHtml(d)}</span>`).join('')}
          </div>
        ` : ''}
        ${(a.tags && a.tags.length > 0) ? `
          <div class="card-tags">
            ${a.tags.map(t => `<span class="tag" style="background:#fff3e0;color:#e65100">${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
        ${(a.email || a.homepage) ? `
          <div class="card-contact">
            ${a.email ? `<span style="cursor:pointer" onclick="copyToClipboard('${escapeHtml(a.email)}')">📧 ${escapeHtml(a.email)}</span>` : ''}
            ${a.homepage ? `<span>🔗 <a href="${escapeHtml(a.homepage)}" target="_blank">个人主页</a></span>` : ''}
          </div>
        ` : ''}
        ${a.lastContactDate ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">最近联系：${escapeHtml(a.lastContactDate)}</div>` : ''}
        ${a.notes ? `<div class="card-notes">${escapeHtml(a.notes)}</div>` : ''}
        <div class="card-actions">
          <button class="table-action" onclick="editAdvisor('${a.id}')">编辑</button>
          <button class="table-action danger" onclick="deleteAdvisorConfirm('${a.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== Advisor Form =====

function addAdvisorModal() {
  const schools = getSchools();
  if (schools.length === 0) {
    showToast('请先在"院校列表"中添加院校');
    return;
  }
  showModal('新增导师', advisorFormHTML(null), () => saveAdvisorFromForm(null));
}

function editAdvisor(id) {
  const advisors = getAdvisors();
  const advisor = advisors.find(a => a.id === id);
  if (!advisor) return;
  showModal('编辑导师', advisorFormHTML(advisor), () => saveAdvisorFromForm(id));
}

function advisorFormHTML(advisor) {
  const schools = getSchools();
  const d = advisor || {};
  const allTitles = getAllTitles();
  const currentSchoolId = d.schoolId || '';
  const collegeOptions = currentSchoolId ? getCollegesBySchool(currentSchoolId) : [];
  const directionOptions = currentSchoolId ? getDirectionsBySchool(currentSchoolId) : [];
  return `
    <div class="form-group">
      <label>姓名 *</label>
      <input id="af-name" type="text" value="${escapeHtml(d.name || '')}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>所属院校 *</label>
        <select id="af-schoolId" required onchange="onSchoolChange()">
          <option value="">请选择</option>
          ${schools.map(s => `<option value="${s.id}" ${d.schoolId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>所属学院（用逗号分隔，可填多个）</label>
        <input id="af-college" type="text" list="dl-college" value="${escapeHtml(Array.isArray(d.college) ? d.college.join('，') : (d.college || ''))}" placeholder="例：计算机科学与技术学院，人工智能学院">
        <datalist id="dl-college">
          ${collegeOptions.map(c => `<option value="${escapeHtml(c)}">`).join('')}
        </datalist>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>职称</label>
        <input id="af-title" type="text" list="dl-title" value="${escapeHtml(d.title || '')}" placeholder="请选择或输入职称">
        <datalist id="dl-title">
          ${allTitles.map(t => `<option value="${escapeHtml(t)}">`).join('')}
        </datalist>
      </div>
      <div class="form-group">
        <label>最近联系</label>
        <div class="date-wrap${d.lastContactDate ? ' has-value' : ''}">
          <input id="af-lastContact" class="date-field" type="date" value="${escapeHtml(d.lastContactDate || '')}" onchange="updateDateHint(this)">
          <span class="date-hint">年/月/日</span>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>研究方向（用逗号分隔）</label>
      <input id="af-directions" type="text" list="dl-directions" value="${escapeHtml((d.researchDirection || []).join('，'))}" placeholder="例：机器学习，自然语言处理，计算机视觉">
      <datalist id="dl-directions">
        ${directionOptions.map(dir => `<option value="${escapeHtml(dir)}">`).join('')}
      </datalist>
    </div>
    <div class="form-group">
      <label>自定义标签（用逗号分隔）</label>
      <input id="af-tags" type="text" value="${escapeHtml((d.tags || []).join('，'))}" placeholder="例：强推，边缘计算，需提前联系">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>邮箱</label>
        <input id="af-email" type="email" value="${escapeHtml(d.email || '')}">
      </div>
      <div class="form-group">
        <label>个人主页</label>
        <input id="af-homepage" type="url" value="${escapeHtml(d.homepage || '')}" placeholder="https://...">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>意向程度 *</label>
        <select id="af-interest" required>
          ${INTEREST_OPTIONS.map(l => `<option value="${l}" ${d.interestLevel === l ? 'selected' : ''}>${interestLabel(l)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>联系进展 *</label>
        <select id="af-progress" required>
          ${PROGRESS_OPTIONS.map(p => `<option value="${p}" ${d.progress === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="af-notes">${escapeHtml(d.notes || '')}</textarea>
    </div>
  `;
}

function saveAdvisorFromForm(editId) {
  const name = document.getElementById('af-name').value.trim();
  const schoolId = document.getElementById('af-schoolId').value;
  const collegeRaw = document.getElementById('af-college').value.trim();
  const college = collegeRaw
    ? collegeRaw.split(/[,，、]/).map(c => c.trim()).filter(Boolean)
    : [];
  const title = document.getElementById('af-title').value;
  const dirsRaw = document.getElementById('af-directions').value;
  const tagsRaw = document.getElementById('af-tags').value;
  const email = document.getElementById('af-email').value.trim();
  const homepage = document.getElementById('af-homepage').value.trim();
  const interestLevel = document.getElementById('af-interest').value;
  const progress = document.getElementById('af-progress').value;
  const lastContactDate = document.getElementById('af-lastContact').value;
  const notes = document.getElementById('af-notes').value.trim();

  if (!name || !schoolId) {
    showToast('请填写姓名和院校');
    return;
  }

  const researchDirection = dirsRaw
    ? dirsRaw.split(/[,，、]/).map(d => d.trim()).filter(Boolean)
    : [];
  const tags = tagsRaw
    ? tagsRaw.split(/[,，、]/).map(t => t.trim()).filter(Boolean)
    : [];

  // Auto-update lastContactDate when progress changes
  let finalLastContact = lastContactDate;
  if (editId && progress) {
    const advisors = getAdvisors();
    const old = advisors.find(a => a.id === editId);
    if (old && old.progress !== progress && progress !== '未联系') {
      finalLastContact = new Date().toISOString().slice(0, 10);
    }
  } else if (!editId && progress && progress !== '未联系') {
    finalLastContact = lastContactDate || new Date().toISOString().slice(0, 10);
  }

  const data = { name, schoolId, college, title, researchDirection, tags, email, homepage, interestLevel, progress, lastContactDate: finalLastContact, notes };

  if (editId) {
    updateAdvisor(editId, data);
    showToast('导师信息已更新');
  } else {
    addAdvisor(data);
    showToast('导师已添加');
  }
  hideModal();
  renderDashboard();
}

function onSchoolChange() {
  const schoolId = document.getElementById('af-schoolId').value;
  const colleges = schoolId ? getCollegesBySchool(schoolId) : [];
  const dirs = schoolId ? getDirectionsBySchool(schoolId) : [];
  const dlCollege = document.getElementById('dl-college');
  const dlDirs = document.getElementById('dl-directions');
  if (dlCollege) {
    dlCollege.innerHTML = colleges.map(c => `<option value="${escapeHtml(c)}">`).join('');
  }
  if (dlDirs) {
    dlDirs.innerHTML = dirs.map(d => `<option value="${escapeHtml(d)}">`).join('');
  }
}

function deleteAdvisorConfirm(id) {
  if (confirm('确认删除该导师及其关联的时间节点？')) {
    deleteAdvisor(id);
    showToast('已删除');
    renderDashboard();
  }
}

// ===== Schools =====

function renderSchools() {
  const container = document.getElementById('schools-tab');
  const schools = getSchools();
  const advisors = getAdvisors();

  container.innerHTML = `
    <div class="schools-header">
      <h3>院校列表 (${schools.length})</h3>
      <button class="btn btn-primary" onclick="addSchoolModal()">+ 新增院校</button>
    </div>
    <div class="school-table">
      <table>
        <thead>
          <tr>
            <th style="width:32px"></th>
            <th>院校名称</th>
            <th>层次</th>
            <th>城市</th>
            <th>导师数</th>
            <th style="width:120px">操作</th>
          </tr>
        </thead>
        <tbody>
          ${schools.length === 0 ? `
            <tr><td colspan="6">
              <div class="empty-state">
                <div class="empty-icon">🏫</div>
                <div class="empty-text">暂无院校，点击右上角新增</div>
              </div>
            </td></tr>
          ` : schools.map(s => {
            const schoolAdvisors = advisors.filter(a => a.schoolId === s.id);
            return `
              <tr class="expand-row" onclick="toggleSchoolExpand('${s.id}')">
                <td><span class="expand-icon" id="expand-icon-${s.id}">▶</span></td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><span class="tier-tag tier-${s.tier}">${escapeHtml(s.tier)}</span></td>
                <td>${escapeHtml(s.location || '—')}</td>
                <td>${schoolAdvisors.length}</td>
                <td>
                  <button class="table-action" onclick="event.stopPropagation(); editSchoolModal('${s.id}')">编辑</button>
                  <button class="table-action danger" onclick="event.stopPropagation(); deleteSchoolConfirm('${s.id}')">删除</button>
                </td>
              </tr>
              <tr id="advisor-panel-${s.id}" class="school-advisors-panel">
                <td colspan="6">
                  ${schoolAdvisors.length === 0 ? '<em style="color:#999">该院校暂无导师</em>' :
                    (() => {
                      const grouped = {};
                      schoolAdvisors.forEach(a => {
                        const rawCollege = Array.isArray(a.college) ? a.college : (a.college ? [a.college] : []);
                        const colleges = rawCollege.length > 0 ? rawCollege : ['未分配学院'];
                        colleges.forEach(c => {
                          const key = c || '未分配学院';
                          if (!grouped[key]) grouped[key] = [];
                          grouped[key].push(a);
                        });
                      });
                      return Object.entries(grouped).map(([college, advisors]) => `
                        <div style="margin-bottom:10px">
                          <div style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)">${escapeHtml(college)}（${advisors.length}人）</div>
                          <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
                            ${advisors.map((a, idx) => `
                              <div style="display:flex;align-items:center;gap:12px;padding:8px 14px;${idx > 0 ? 'border-top:1px solid #f0f0f0;' : ''}transition:background 0.15s;cursor:default" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
                                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap">
                                  <span style="font-size:14px;font-weight:600">${escapeHtml(a.name)}</span>
                                  <span style="font-size:12px;color:var(--text-secondary)">${escapeHtml(a.title || '')}</span>
                                  <span class="badge badge-lvl-${a.interestLevel.toLowerCase()}">${interestLabel(a.interestLevel)}</span>
                                  <span class="badge badge-prog-${a.progress}">${a.progress}</span>
                                </div>
                                <div style="display:flex;flex-wrap:wrap;gap:3px;flex:1;min-width:0">
                                  ${(a.researchDirection || []).map(d => `<span class="tag">${escapeHtml(d)}</span>`).join('')}
                                  ${(a.tags || []).map(t => `<span class="tag" style="background:#fff3e0;color:#e65100">${escapeHtml(t)}</span>`).join('')}
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;font-size:12px;color:var(--text-secondary)">
                                  ${a.email ? `<span style="cursor:pointer;color:var(--primary)" onclick="copyToClipboard('${escapeHtml(a.email)}')">📧</span>` : ''}
                                  ${a.homepage ? `<a href="${escapeHtml(a.homepage)}" target="_blank" style="color:var(--primary);text-decoration:none">🔗</a>` : ''}
                                  ${a.lastContactDate ? `<span style="white-space:nowrap">${escapeHtml(a.lastContactDate)}</span>` : ''}
                                </div>
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      `).join('');
                    })()
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleSchoolExpand(id) {
  const panel = document.getElementById('advisor-panel-' + id);
  const icon = document.getElementById('expand-icon-' + id);
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  icon.classList.toggle('open', !isOpen);
}

// ===== School Form =====

function addSchoolModal() {
  showModal('新增院校', schoolFormHTML(null), () => saveSchoolFromForm(null));
}

function editSchoolModal(id) {
  const school = getSchoolById(id);
  if (!school) return;
  showModal('编辑院校', schoolFormHTML(school), () => saveSchoolFromForm(id));
}

function schoolFormHTML(school) {
  const d = school || {};
  return `
    <div class="form-group">
      <label>院校名称 *</label>
      <input id="sf-name" type="text" value="${escapeHtml(d.name || '')}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>层次 *</label>
        <select id="sf-tier" required>
          <option value="">请选择</option>
          ${TIER_OPTIONS.map(t => `<option value="${t}" ${d.tier === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>所在城市</label>
        <input id="sf-location" type="text" value="${escapeHtml(d.location || '')}" placeholder="例：北京">
      </div>
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="sf-notes">${escapeHtml(d.notes || '')}</textarea>
    </div>
  `;
}

function saveSchoolFromForm(editId) {
  const name = document.getElementById('sf-name').value.trim();
  const tier = document.getElementById('sf-tier').value;
  const location = document.getElementById('sf-location').value.trim();
  const notes = document.getElementById('sf-notes').value.trim();

  if (!name || !tier) {
    showToast('请填写院校名称和层次');
    return;
  }

  const data = { name, tier, location, notes };

  if (editId) {
    updateSchool(editId, data);
    showToast('院校信息已更新');
  } else {
    addSchool(data);
    showToast('院校已添加');
  }
  hideModal();
  renderSchools();
}

function deleteSchoolConfirm(id) {
  if (confirm('删除该院校将同时删除其下所有导师和关联的时间节点，确认删除？')) {
    deleteSchool(id);
    showToast('已删除');
    renderSchools();
  }
}

// ===== Timeline =====
// Full render: header + filter bar + results container (called on tab switch, data mutation)
// Partial render (applyTimelineFilters): only updates #timelineResults, input survives

function renderTimeline() {
  const container = document.getElementById('timeline-tab');
  const schools = getSchools();

  const prevType = document.getElementById('tlFilterType')?.value || '';
  const prevSchool = document.getElementById('tlFilterSchool')?.value || '';
  const prevSearch = document.getElementById('tlFilterSearch')?.value || '';

  container.innerHTML = `
    <div class="timeline-header">
      <h3>时间线</h3>
      <button class="btn btn-primary" onclick="addEventModal()">+ 新增事件</button>
    </div>

    <div class="filters" id="tlFilterBar">
      <select class="filter-select" id="tlFilterType" onchange="applyTimelineFilters()">
        <option value="">全部类型</option>
        ${EVENT_TYPE_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <select class="filter-select" id="tlFilterSchool" onchange="applyTimelineFilters()">
        <option value="">全部院校</option>
        ${schools.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
      </select>
      <input class="filter-input" id="tlFilterSearch" type="text" placeholder="搜索事件描述..." oninput="debounceTimelineResults()">
      <button class="btn" onclick="clearTimelineFilters()">重置</button>
    </div>

    <div id="timelineResults"></div>
  `;

  if (prevType) document.getElementById('tlFilterType').value = prevType;
  if (prevSchool) document.getElementById('tlFilterSchool').value = prevSchool;
  if (prevSearch) document.getElementById('tlFilterSearch').value = prevSearch;

  renderTimelineResults();
}

function renderTimelineResults() {
  const results = document.getElementById('timelineResults');
  if (!results) return;

  const events = getEvents();
  const schools = getSchools();
  const advisors = getAdvisors();

  const filterType = document.getElementById('tlFilterType')?.value || '';
  const filterSchool = document.getElementById('tlFilterSchool')?.value || '';
  const filterSearch = document.getElementById('tlFilterSearch')?.value || '';

  let filtered = [...events];
  if (filterType) filtered = filtered.filter(e => e.type === filterType);
  if (filterSchool) filtered = filtered.filter(e => e.schoolId === filterSchool);
  if (filterSearch) {
    const kw = filterSearch.toLowerCase();
    filtered = filtered.filter(e => (e.description || '').toLowerCase().includes(kw));
  }

  const schoolMap = {};
  schools.forEach(s => { schoolMap[s.id] = s; });
  const advisorMap = {};
  advisors.forEach(a => { advisorMap[a.id] = a; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms1day = 1 * 24 * 60 * 60 * 1000;

  function getDateClass(dateStr) {
    const d = parseDateLocal(dateStr);
    const diff = d - today;
    if (diff < 0) return 'past';
    if (diff <= ms1day) return 'urgent';
    return 'upcoming';
  }

  const headerEl = document.querySelector('#timeline-tab .timeline-header h3');
  if (headerEl) headerEl.textContent = '时间线 (' + filtered.length + ')';

  results.innerHTML = filtered.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">📅</div>
      <div class="empty-text">暂无时间节点</div>
    </div>
  ` : `
    <div class="timeline-list">
      ${filtered.map(e => {
        const dateClass = getDateClass(e.date);
        const d = parseDateLocal(e.date);
        const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        const school = schoolMap[e.schoolId];
        const advisor = advisorMap[e.advisorId];
        let meta = [];
        if (school) meta.push(school.name);
        if (advisor) meta.push(advisor.name);
        if (e.time) meta.push(e.time);
        return '<div class="timeline-item' + (dateClass === 'past' ? ' past' : '') + '">' +
          '<div class="timeline-date-box ' + dateClass + '">' +
            '<div class="date-day">' + d.getDate() + '</div>' +
            '<div class="date-month">' + monthNames[d.getMonth()] + '</div>' +
          '</div>' +
          '<div class="timeline-details">' +
            '<div class="event-type">' + escapeHtml(e.type) + '</div>' +
            '<div class="event-desc">' + escapeHtml(e.description || '(无描述)') + '</div>' +
            '<div class="event-meta">' + (meta.join(' · ') || '—') + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px;align-items:flex-start">' +
            '<button class="table-action" onclick="event.stopPropagation(); editEventModal(\'' + e.id + '\')">编辑</button>' +
            '<button class="table-action danger" onclick="event.stopPropagation(); deleteEventConfirm(\'' + e.id + '\')">删除</button>' +
          '</div>' +
        '</div>';
      }).join('')}
    </div>
  `;
}

function applyTimelineFilters() {
  renderTimelineResults();
}

function clearTimelineFilters() {
  ['tlFilterType', 'tlFilterSchool'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const searchEl = document.getElementById('tlFilterSearch');
  if (searchEl) searchEl.value = '';
  renderTimelineResults();
}

// ===== Event Form =====

function addEventModal() {
  showModal('新增事件', eventFormHTML(null), () => saveEventFromForm(null));
}

function editEventModal(id) {
  const events = getEvents();
  const ev = events.find(e => e.id === id);
  if (!ev) return;
  showModal('编辑事件', eventFormHTML(ev), () => saveEventFromForm(id));
}

function eventFormHTML(ev) {
  const schools = getSchools();
  const advisors = getAdvisors();
  const d = ev || {};
  return `
    <div class="form-group">
      <label>事件类型 *</label>
      <select id="ef-type" required>
        <option value="">请选择</option>
        ${EVENT_TYPE_OPTIONS.map(t => `<option value="${t}" ${d.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>日期 *</label>
        <div class="date-wrap${d.date ? ' has-value' : ''}">
          <input id="ef-date" class="date-field" type="date" value="${d.date || ''}" onchange="updateDateHint(this)" required>
          <span class="date-hint">年/月/日</span>
        </div>
      </div>
      <div class="form-group">
        <label>时间</label>
        <input id="ef-time" type="time" value="${d.time || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>关联院校</label>
        <select id="ef-schoolId">
          <option value="">不限</option>
          ${schools.map(s => `<option value="${s.id}" ${d.schoolId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>关联导师</label>
        <select id="ef-advisorId">
          <option value="">不限</option>
          ${advisors.map(a => `<option value="${a.id}" ${d.advisorId === a.id ? 'selected' : ''}>${escapeHtml(a.name)} (${interestLabel(a.interestLevel)})</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>事件描述</label>
      <textarea id="ef-desc">${escapeHtml(d.description || '')}</textarea>
    </div>
  `;
}

function saveEventFromForm(editId) {
  const type = document.getElementById('ef-type').value;
  const date = document.getElementById('ef-date').value;
  const time = document.getElementById('ef-time').value;
  const schoolId = document.getElementById('ef-schoolId').value;
  const advisorId = document.getElementById('ef-advisorId').value;
  const description = document.getElementById('ef-desc').value.trim();

  if (!type || !date) {
    showToast('请填写事件类型和日期');
    return;
  }

  const data = { type, date, time, schoolId: schoolId || '', advisorId: advisorId || '', description };

  if (editId) {
    updateEvent(editId, data);
    showToast('事件已更新');
  } else {
    addEvent(data);
    showToast('事件已添加');
  }
  hideModal();
  renderTimeline();
}

function deleteEventConfirm(id) {
  if (confirm('确认删除该事件？')) {
    deleteEvent(id);
    showToast('已删除');
    renderTimeline();
  }
}

// ===== Export / Import =====

function exportData() {
  const json = exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'baoyan_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON 已导出');
}

function exportMarkdown() {
  const schools = getSchools();
  const advisors = getAdvisors();
  let md = '# 保研导师信息汇总\n\n';
  md += '> 导出时间：' + new Date().toLocaleString() + '\n\n---\n\n';

  schools.forEach(s => {
    const schoolAdvisors = advisors.filter(a => a.schoolId === s.id);
    if (schoolAdvisors.length === 0) return;
    md += '## ' + s.name + '（' + (s.tier || '其他') + '）\n';
    if (s.location) md += '📍 ' + s.location + '\n\n';
    else md += '\n';

    // Group by college
    const grouped = {};
    schoolAdvisors.forEach(a => {
      const rawCollege = Array.isArray(a.college) ? a.college : (a.college ? [a.college] : []);
      const colleges = rawCollege.length > 0 ? rawCollege : ['未分配学院'];
      colleges.forEach(c => {
        const key = c || '未分配学院';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(a);
      });
    });

    Object.entries(grouped).forEach(([college, ad]) => {
      md += '### ' + college + '（' + ad.length + '人）\n\n';
      ad.forEach(a => {
        md += '- **' + a.name + '**';
        if (a.title) md += ' · ' + a.title;
        md += ' | 意向: ' + a.interestLevel;
        md += ' | 进展: ' + a.progress + '\n';
        if (a.researchDirection && a.researchDirection.length > 0) {
          md += '  - 研究方向：' + a.researchDirection.join('、') + '\n';
        }
        if (a.tags && a.tags.length > 0) {
          md += '  - 标签：' + a.tags.join('、') + '\n';
        }
        if (a.email) {
          md += '  - 📧 ' + a.email + '\n';
        }
        if (a.homepage) {
          md += '  - 🔗 ' + a.homepage + '\n';
        }
        if (a.lastContactDate) {
          md += '  - 最近联系：' + a.lastContactDate + '\n';
        }
        if (a.notes) {
          md += '  - 备注：' + a.notes + '\n';
        }
        md += '\n';
      });
    });
    md += '---\n\n';
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'baoyan_advisors_' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Markdown 已导出');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importJSON(ev.target.result);
        showToast('数据导入成功');
        renderDashboard();
      } catch (err) {
        showToast('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== AI Import =====

let _aiImportData = null;

function openAIImportModal() {
  _aiImportData = null;
  const systemPrompt = '请将我提供的导师信息整理成以下 JSON 格式输出。严格使用指定的英文字段名，不要使用中文字段名，必须放在一个 advisors 数组中。每个导师需包含以下字段：\n\n- name（必填）：导师姓名\n- title（必填）：职称，如教授、副教授、特任教授等\n- school（必填）：所属院校全称\n- college（必填）：所属学院，必须为字符串数组。若导师属于多个学院，请务必全部列出并放入数组中。例如 ["信息科学技术学院", "人工智能学院"]\n- location（必填）：学校所在城市，例如合肥、南京、上海等\n- universityLevel（必填）：学校层次，根据 school 识别，必须严格从以下选项中选择："C9", "华五", "985", "211", "双一流", "其他"（若同时符合多个，选最高层级，如C9>华五>985）\n- researchDirection（必填）：研究方向，字符串数组\n- email（必填）：电子邮箱\n- homepage（必填）：截图界面浏览器地址栏中显示的完整网址\n- interestLevel（必填）：A/B/C，分别表示最想去/比较想/备选，默认比较想\n- progress（必填）：未联系/已发邮件待回复/已回复沟通中/已面试/已确认接收/已放弃，默认未联系\n- notes（选填）：备注，可放荣誉、奖项等\n\n输出格式示例：\n{\n  "advisors": [\n    {\n      "name": "刘东",\n      "title": "教授",\n      "school": "中国科学技术大学",\n      "college": ["信息科学技术学院"],\n      "location": "合肥",\n      "universityLevel": "华五",\n      "researchDirection": ["图像视频处理", "编码和分析"],\n      "email": "apply4dliu@163.com",\n      "homepage": "https://iatyz.ustc.edu.cn/teacher/profile/name/刘东",\n      "interestLevel": "B",\n      "progress": "未联系",\n      "notes": "2019年国家技术发明二等奖"\n    }\n  ]\n}';
  const bodyHtml = `
    <p class="ai-import-hint">可将导师个人信息界面截图发送给 AI，配合下方提示词进行导入。</p>
    <div class="form-group" style="margin-bottom:8px">
      <label style="font-size:13px">系统预设提示词（可复制给 AI 使用）</label>
      <div style="display:flex;gap:8px">
        <textarea id="ai-import-prompt" class="ai-import-textarea" style="min-height:100px;font-size:12px" readonly>${escapeHtml(systemPrompt)}</textarea>
      </div>
      <button class="btn btn-sm" style="margin-top:6px" onclick="copyAIImportPrompt()">复制提示词</button>
    </div>
    <div class="form-group">
      <textarea id="ai-import-input" class="ai-import-textarea" placeholder="在此粘贴 AI 输出的 JSON 内容..."></textarea>
    </div>
    <div id="ai-import-error" class="ai-import-error"></div>
    <div id="ai-import-preview"></div>
    <div id="ai-import-summary" class="ai-import-summary"></div>
    <div class="ai-import-buttons">
      <button class="btn btn-primary" onclick="parseAndPreview()">解析预览</button>
      <button class="btn" id="ai-import-confirm" disabled onclick="executeAIImport()">确认导入</button>
    </div>
  `;
  showModal('JSON 批量导入导师', bodyHtml, null);
  document.getElementById('modalSave').style.display = 'none';
}

function copyAIImportPrompt() {
  const ta = document.getElementById('ai-import-prompt');
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    showToast('提示词已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败，请手动选择复制');
  });
}

function hideAIImportModal() {
  document.getElementById('modalSave').style.display = '';
  hideModal();
}

// ===== AI Import Parser =====

function parseAIImportInput(text) {
  let content = text.trim();
  if (!content) throw new Error('输入内容为空');

  // Step 1: strip Markdown code fences
  const mdfence = content.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  if (mdfence) content = mdfence[1].trim();

  // Step 2: JSON.parse with trailing-comma tolerance
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e1) {
    try {
      const fixed = content.replace(/,\s*([]}])/g, '$1');
      parsed = JSON.parse(fixed);
    } catch (e2) {
      throw new Error('JSON 解析失败：' + e1.message);
    }
  }

  // Step 3: normalize into [{ name, title, school, ... }]
  let rawAdvisors = [];

  function collect(items) {
    items.forEach(item => {
      if (item.advisors && Array.isArray(item.advisors)) {
        const topSchool = item.school || '';
        item.advisors.forEach(a => {
          if (!a.school && topSchool) a = { ...a, school: topSchool };
          rawAdvisors.push(a);
        });
      } else if (item.name) {
        rawAdvisors.push(item);
      }
    });
  }

  if (Array.isArray(parsed)) {
    collect(parsed);
  } else if (parsed && typeof parsed === 'object') {
    if (parsed.advisors && Array.isArray(parsed.advisors)) {
      collect([parsed]);
    } else if (parsed.name) {
      rawAdvisors.push(parsed);
    } else {
      throw new Error('无法识别的 JSON 结构，需要包含 advisors 数组或 name 字段');
    }
  } else {
    throw new Error('输入内容不是有效的 JSON 对象或数组');
  }

  if (rawAdvisors.length === 0) throw new Error('未识别到任何导师数据，请确认 JSON 中包含 name 字段');

  // Step 4: validate & match schools
  const schools = getSchools();
  const newSchoolsMap = {};
  const result = [];
  let hasMissingSchool = false;

  rawAdvisors.forEach(a => {
    if (!a.name || typeof a.name !== 'string') return;
    const advisor = {
      name: a.name.trim(),
      title: a.title || '',
      college: Array.isArray(a.college) ? a.college.filter(Boolean) : (a.college ? [a.college] : []),
      researchDirection: Array.isArray(a.researchDirection) ? a.researchDirection : [],
      tags: Array.isArray(a.tags) ? a.tags : [],
      email: a.email || '',
      homepage: a.homepage || '',
      interestLevel: ['A', 'B', 'C'].includes(a.interestLevel) ? a.interestLevel : 'B',
      progress: a.progress || '未联系',
      notes: a.notes || '',
      schoolId: '',
      schoolName: '',
      schoolTier: '',
      isNewSchool: false,
      schoolMissing: false,
      schoolLocation: a.location || ''
    };

    const rawSchool = (a.school || '').trim();
    if (rawSchool) {
      let matched = null;
      for (const s of schools) {
        if (s.name.trim().toLowerCase() === rawSchool.toLowerCase()) {
          matched = s;
          break;
        }
      }
      if (matched) {
        advisor.schoolId = matched.id;
        advisor.schoolName = matched.name;
        const incomingTier = (a.universityLevel || a.tier || '').trim();
        advisor.schoolTier = (incomingTier && TIER_OPTIONS.includes(incomingTier)) ? incomingTier : (matched.tier || '');
        advisor.schoolLocation = a.location || matched.location || '';
      } else {
        const key = rawSchool.toLowerCase();
        if (!newSchoolsMap[key]) {
          const rawTier = (a.universityLevel || a.tier || '其他').trim();
          const validTier = TIER_OPTIONS.includes(rawTier) ? rawTier : '其他';
          newSchoolsMap[key] = { id: 'new_' + genId(), name: rawSchool, tier: validTier, location: a.location || '', notes: '' };
        } else {
          if (a.location && !newSchoolsMap[key].location) newSchoolsMap[key].location = a.location;
          const rawTier = (a.universityLevel || a.tier || '').trim();
          if (rawTier && TIER_OPTIONS.includes(rawTier) && newSchoolsMap[key].tier === '其他') newSchoolsMap[key].tier = rawTier;
        }
        advisor.schoolId = newSchoolsMap[key].id;
        advisor.schoolName = rawSchool;
        advisor.isNewSchool = true;
        advisor.schoolTier = newSchoolsMap[key].tier;
        advisor.schoolLocation = newSchoolsMap[key].location;
      }
    } else {
      advisor.schoolMissing = true;
      hasMissingSchool = true;
    }

    result.push(advisor);
  });

  return {
    advisors: result,
    newSchools: Object.values(newSchoolsMap),
    hasMissingSchool
  };
}

// ===== AI Import Preview =====

function parseAndPreview() {
  const errEl = document.getElementById('ai-import-error');
  const previewEl = document.getElementById('ai-import-preview');
  const summaryEl = document.getElementById('ai-import-summary');
  const confirmBtn = document.getElementById('ai-import-confirm');
  const textarea = document.getElementById('ai-import-input');

  errEl.classList.remove('show');
  errEl.textContent = '';
  previewEl.innerHTML = '';
  summaryEl.textContent = '';
  confirmBtn.disabled = true;

  const raw = textarea.value;
  if (!raw.trim()) {
    errEl.textContent = '请输入内容';
    errEl.classList.add('show');
    return;
  }

  let parsed;
  try {
    parsed = parseAIImportInput(raw);
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.add('show');
    return;
  }

  _aiImportData = parsed;
  renderAIImportPreview(parsed);
  confirmBtn.disabled = false;

  const matchedCount = parsed.advisors.filter(a => !a.isNewSchool && !a.schoolMissing).length;
  const newCount = parsed.newSchools.length;
  const missingCount = parsed.advisors.filter(a => a.schoolMissing).length;
  let summary = '解析完成，共识别出 ' + parsed.advisors.length + ' 位导师。';
  if (newCount > 0) summary += ' 其中 ' + newCount + ' 所院校未在现有列表中找到，系统将自动为您创建。';
  if (missingCount > 0) summary += ' 另有 ' + missingCount + ' 位导师未指定所属院校，请在下方为其选择或输入院校名称后重新解析。';
  summaryEl.textContent = summary;

  if (parsed.hasMissingSchool) {
    renderSchoolAssignmentUI(previewEl);
  }
}

function renderAIImportPreview(parsed) {
  const previewEl = document.getElementById('ai-import-preview');
  let html = '<table class="ai-preview-table"><thead><tr>';
  html += '<th><input type="checkbox" id="ai-check-all" onchange="toggleAllAIChecks(this)" checked></th>';
  html += '<th>姓名</th><th>职称</th><th>学院</th><th>研究方向</th><th>邮箱</th><th>意向</th><th>所属院校</th>';
  html += '</tr></thead><tbody>';

  parsed.advisors.forEach((a, i) => {
    html += '<tr>';
    html += '<td><input type="checkbox" class="ai-row-check" data-idx="' + i + '" checked></td>';
    html += '<td><strong>' + escapeHtml(a.name) + '</strong></td>';
    html += '<td>' + escapeHtml(a.title || '—') + '</td>';
    html += '<td>' + (Array.isArray(a.college) && a.college.length > 0 ? escapeHtml(a.college.join('、')) : '—') + '</td>';
    html += '<td>' + (a.researchDirection.length > 0 ? a.researchDirection.map(d => '<span class="tag">' + escapeHtml(d) + '</span>').join('') : '—') + '</td>';
    html += '<td>' + (a.email ? escapeHtml(a.email) : '—') + '</td>';
    html += '<td><span class="badge badge-lvl-' + a.interestLevel.toLowerCase() + '">' + interestLabel(a.interestLevel) + '</span></td>';
    html += '<td>' + escapeHtml(a.schoolName || '—');
    if (a.isNewSchool) html += '<span class="ai-tag-new">新建</span>';
    if (a.schoolMissing) html += '<span class="ai-tag-missing">缺失</span>';
    if (a.schoolTier) html += '<span class="tier-tag tier-' + a.schoolTier + '" style="font-size:10px;margin-left:3px">' + escapeHtml(a.schoolTier) + '</span>';
    if (a.schoolLocation) html += '<span style="font-size:10px;color:var(--text-secondary);margin-left:3px">' + escapeHtml(a.schoolLocation) + '</span>';
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  previewEl.insertAdjacentHTML('beforeend', html);
}

function toggleAllAIChecks(el) {
  document.querySelectorAll('.ai-row-check').forEach(cb => { cb.checked = el.checked; });
}

function renderSchoolAssignmentUI(previewEl) {
  const schools = getSchools();
  let html = '<div class="ai-school-assign">';
  html += '<span style="font-size:13px;color:var(--text-secondary);white-space:nowrap">为缺失院校的导师指定：</span>';
  html += '<select id="ai-assign-school-select"><option value="">选择已有院校</option>';
  schools.forEach(s => { html += '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>'; });
  html += '</select>';
  html += '<input id="ai-assign-school-input" type="text" placeholder="或输入新院校名称">';
  html += '<button class="btn btn-sm btn-primary" onclick="applySchoolToSelected()">应用</button>';
  html += '</div>';
  previewEl.insertAdjacentHTML('afterbegin', html);
}

function applySchoolToSelected() {
  if (!_aiImportData) return;
  const selectEl = document.getElementById('ai-assign-school-select');
  const inputEl = document.getElementById('ai-assign-school-input');
  const schoolId = selectEl.value;
  const schoolName = (inputEl.value || '').trim();

  if (!schoolId && !schoolName) {
    showToast('请选择一个已有院校或输入新院校名称');
    return;
  }

  let resolvedId, resolvedName, isNew;
  if (schoolId) {
    const s = getSchoolById(schoolId);
    if (s) { resolvedId = s.id; resolvedName = s.name; isNew = false; }
  }
  if (!resolvedId && schoolName) {
    const schools = getSchools();
    let matched = null;
    for (const s of schools) {
      if (s.name.trim().toLowerCase() === schoolName.toLowerCase()) { matched = s; break; }
    }
    if (matched) {
      resolvedId = matched.id; resolvedName = matched.name; isNew = false;
    } else {
      resolvedId = 'new_' + genId();
      resolvedName = schoolName;
      isNew = true;
      // ensure in newSchools list
      const key = schoolName.toLowerCase();
      let found = false;
      for (const ns of _aiImportData.newSchools) {
        if (ns.name.toLowerCase() === key) { found = true; break; }
      }
      if (!found) {
        _aiImportData.newSchools.push({ id: resolvedId, name: resolvedName, tier: '其他', location: '', notes: '' });
      }
    }
  }

  if (!resolvedId) return;

  document.querySelectorAll('.ai-row-check').forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.idx);
      const a = _aiImportData.advisors[idx];
      if (a && a.schoolMissing) {
        a.schoolId = resolvedId;
        a.schoolName = resolvedName;
        a.isNewSchool = isNew;
        a.schoolMissing = false;
      }
    }
  });

  _aiImportData.hasMissingSchool = _aiImportData.advisors.some(a => a.schoolMissing);
  // re-render preview
  const previewEl = document.getElementById('ai-import-preview');
  previewEl.innerHTML = '';
  renderAIImportPreview(_aiImportData);
  const summaryEl = document.getElementById('ai-import-summary');
  const missingCount = _aiImportData.advisors.filter(a => a.schoolMissing).length;
  if (missingCount > 0) {
    summaryEl.textContent = summaryEl.textContent.replace(/另有.*$/, '仍有 ' + missingCount + ' 位导师未指定所属院校。');
    renderSchoolAssignmentUI(previewEl);
  } else {
    summaryEl.textContent = summaryEl.textContent.replace(/另有.*$/, '').trim();
  }
  showToast('已更新选中导师的院校信息');
}

// ===== AI Import Execute =====

function executeAIImport() {
  if (!_aiImportData) return;

  const checkedCbs = document.querySelectorAll('.ai-row-check:checked');
  if (checkedCbs.length === 0) {
    showToast('请至少勾选一位导师');
    return;
  }

  const indices = Array.from(checkedCbs).map(cb => parseInt(cb.dataset.idx));
  let imported = 0;
  let skipped = 0;

  // Build new school lookup: tempId → school info
  const newSchoolIdMap = {};
  _aiImportData.newSchools.forEach(ns => { newSchoolIdMap[ns.id] = ns; });
  // Track tempId → realId for already-created new schools
  const createdSchools = {};
  const updatedExistingSchools = {};

  indices.forEach(i => {
    const a = _aiImportData.advisors[i];
    if (!a) return;

    let schoolId = a.schoolId;

    // Resolve new school
    if (a.isNewSchool && schoolId) {
      if (createdSchools[schoolId]) {
        // Already created by a previous advisor in this batch
        schoolId = createdSchools[schoolId];
      } else if (newSchoolIdMap[schoolId]) {
        // First time seeing this new school — create it
        const ns = newSchoolIdMap[schoolId];
        const created = addSchool({ name: ns.name, tier: ns.tier, location: ns.location || '', notes: ns.notes || '' });
        createdSchools[schoolId] = created.id;
        schoolId = created.id;
        showToast('已自动创建院校：' + ns.name);
      }
    } else if (!a.isNewSchool && schoolId && !updatedExistingSchools[schoolId]) {
      // Update existing school with latest parsed tier & location
      updatedExistingSchools[schoolId] = true;
      const updates = {};
      if (a.schoolTier && TIER_OPTIONS.includes(a.schoolTier)) updates.tier = a.schoolTier;
      if (a.schoolLocation) updates.location = a.schoolLocation;
      if (Object.keys(updates).length > 0) {
        updateSchool(schoolId, updates);
      }
    }

    if (!schoolId || a.schoolMissing) {
      skipped++;
      return;
    }

    addAdvisor({
      name: a.name,
      schoolId: schoolId,
      college: a.college || [],
      title: a.title,
      researchDirection: a.researchDirection,
      tags: a.tags || [],
      email: a.email,
      homepage: a.homepage,
      interestLevel: a.interestLevel,
      progress: a.progress,
      notes: a.notes
    });
    imported++;
  });

  let msg = '成功导入 ' + imported + ' 位导师';
  if (skipped > 0) msg += '，' + skipped + ' 位导师因信息不全被跳过';
  showToast(msg);
  hideAIImportModal();
  renderDashboard();
  renderSchools();
}

// ===== Date Hint =====

function updateDateHint(el) {
  const wrap = el.closest('.date-wrap');
  if (wrap) wrap.classList.toggle('has-value', !!el.value);
}

// ===== Helpers =====

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
