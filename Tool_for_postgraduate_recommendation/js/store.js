// ===== Data Store — localStorage CRUD =====

const STORE_KEY = 'baoyan_data';

const DEFAULTS = {
  schools: [],
  advisors: [],
  events: []
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        schools: data.schools || [],
        advisors: data.advisors || [],
        events: data.events || []
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return { ...DEFAULTS, schools: [], advisors: [], events: [] };
}

function save(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

// ===== Schools =====

function getSchools() {
  return load().schools;
}

function getSchoolById(id) {
  return load().schools.find(s => s.id === id);
}

function addSchool(school) {
  const data = load();
  const s = { id: genId(), ...school };
  data.schools.push(s);
  save(data);
  return s;
}

function updateSchool(id, updates) {
  const data = load();
  const idx = data.schools.findIndex(s => s.id === id);
  if (idx !== -1) {
    data.schools[idx] = { ...data.schools[idx], ...updates };
    save(data);
  }
}

function deleteSchool(id) {
  const data = load();
  data.schools = data.schools.filter(s => s.id !== id);
  // cascade: delete advisors and events under this school
  data.advisors = data.advisors.filter(a => a.schoolId !== id);
  data.events = data.events.filter(e => e.schoolId !== id);
  save(data);
}

// ===== Advisors =====

function getAdvisors(filter = {}) {
  let advisors = load().advisors;
  if (filter.interestLevel) {
    advisors = advisors.filter(a => a.interestLevel === filter.interestLevel);
  }
  if (filter.progress) {
    advisors = advisors.filter(a => a.progress === filter.progress);
  }
  if (filter.schoolId) {
    advisors = advisors.filter(a => a.schoolId === filter.schoolId);
  }
  if (filter.title) {
    advisors = advisors.filter(a => a.title === filter.title);
  }
  if (filter.direction) {
    advisors = advisors.filter(a =>
      a.researchDirection && a.researchDirection.some(d => d.includes(filter.direction))
    );
  }
  if (filter.search) {
    const kw = filter.search.toLowerCase();
    advisors = advisors.filter(a =>
      a.name.toLowerCase().includes(kw) ||
      (a.researchDirection || []).some(d => d.toLowerCase().includes(kw)) ||
      (a.notes || '').toLowerCase().includes(kw)
    );
  }
  return advisors;
}

function addAdvisor(advisor) {
  const data = load();
  const a = {
    id: genId(),
    college: [],
    researchDirection: [],
    tags: [],
    email: '',
    homepage: '',
    interestLevel: 'B',
    progress: '未联系',
    lastContactDate: '',
    notes: '',
    ...advisor
  };
  data.advisors.push(a);
  save(data);
  return a;
}

function updateAdvisor(id, updates) {
  const data = load();
  const idx = data.advisors.findIndex(a => a.id === id);
  if (idx !== -1) {
    data.advisors[idx] = { ...data.advisors[idx], ...updates };
    save(data);
  }
}

function deleteAdvisor(id) {
  const data = load();
  data.advisors = data.advisors.filter(a => a.id !== id);
  data.events = data.events.filter(e => e.advisorId !== id);
  save(data);
}

// ===== Timeline Events =====

function getEvents(filter = {}) {
  let events = load().events;
  if (filter.type) {
    events = events.filter(e => e.type === filter.type);
  }
  if (filter.schoolId) {
    events = events.filter(e => e.schoolId === filter.schoolId);
  }
  // sort by date ascending
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

function addEvent(event) {
  const data = load();
  const e = {
    id: genId(),
    time: '',
    description: '',
    ...event
  };
  data.events.push(e);
  save(data);
  return e;
}

function updateEvent(id, updates) {
  const data = load();
  const idx = data.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    data.events[idx] = { ...data.events[idx], ...updates };
    save(data);
  }
}

function deleteEvent(id) {
  const data = load();
  data.events = data.events.filter(e => e.id !== id);
  save(data);
}

// ===== Import / Export =====

function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

function importJSON(json) {
  const data = JSON.parse(json);
  if (!data.schools || !data.advisors || !data.events) {
    throw new Error('数据格式不正确：需要包含 schools, advisors, events 字段');
  }
  save(data);
}
