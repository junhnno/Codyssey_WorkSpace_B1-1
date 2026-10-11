const GITHUB_ID = 'junhnno';
const NAV_SCROLL = 60;      // 네비게이션 배경 변경 기준(px)
const TOP_BTN_SCROLL = 300; // 스크롤 탑 버튼 표시 기준(px)
const OBSERVER_THRESHOLD = 0.2;

const header = document.querySelector('#header');
const menu = document.querySelector('#menu');
const hamburger = document.querySelector('#hamburger');
const themeToggle = document.querySelector('#theme-toggle');
const scrollTopBtn = document.querySelector('#scroll-top');

/* ===== 다크 모드: 이벤트 -> 상태 -> 화면 ===== */
let theme = localStorage.getItem('theme') || 'light';

const renderTheme = () => {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
};

themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  renderTheme();
});
renderTheme();

/* ===== 햄버거 메뉴 ===== */
hamburger.addEventListener('click', () => {
  menu.classList.toggle('active');
});

menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => menu.classList.remove('active'));
});

/* ===== 스크롤: 네비게이션 배경 / 스크롤 탑 버튼 ===== */
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > NAV_SCROLL);
  scrollTopBtn.classList.toggle('show', window.scrollY > TOP_BTN_SCROLL);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ===== 스크롤 애니메이션 (Intersection Observer) ===== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: OBSERVER_THRESHOLD });

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

/* ===== GitHub API: 로딩/성공/에러/빈 상태 ===== */
const statusBox = document.querySelector('#projects-status');
const listBox = document.querySelector('#projects-list');

const filterBox = document.querySelector('#projects-filter');

// filter: 선택된 언어 ('all' 이면 전체)
let projectsState = { status: 'loading', repos: [], filter: 'all' };

const renderProjects = () => {
  const { status, repos, filter } = projectsState;
  listBox.innerHTML = '';
  statusBox.innerHTML = '';
  filterBox.innerHTML = '';

  if (status === 'loading') {
    statusBox.innerHTML = '<div class="spinner"></div><p>로딩 중...</p>';
  } else if (status === 'error') {
    statusBox.innerHTML = `
      <p>프로젝트를 불러올 수 없습니다.</p>
      <button id="retry-btn" class="btn" type="button">다시 시도</button>`;
    document.querySelector('#retry-btn').addEventListener('click', loadProjects);
  } else if (status === 'empty') {
    statusBox.textContent = '표시할 프로젝트가 없습니다.';
  } else {
    // 필터 버튼: 저장소 언어 목록(중복 제거) + 전체
    const languages = ['all', ...new Set(repos.map((repo) => repo.language).filter(Boolean))];
    filterBox.innerHTML = languages.map((lang) => `
      <button type="button" class="filter-btn ${lang === filter ? 'active' : ''}" data-lang="${lang}">
        ${lang === 'all' ? '전체' : lang}
      </button>`).join('');
    filterBox.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        projectsState.filter = btn.dataset.lang; // 이벤트 -> 상태 변경
        renderProjects();                        // 상태 -> 화면 업데이트
      });
    });

    // filter: 선택된 언어의 저장소만 표시
    const visible = filter === 'all' ? repos : repos.filter((repo) => repo.language === filter);

    listBox.innerHTML = visible.map(({ name, description, language, stargazers_count, html_url }) => `
      <article class="card">
        <h3><a href="${html_url}" target="_blank" rel="noopener">${name}</a></h3>
        <p>${description || '설명 없음'}</p>
        <p class="meta">${language || '-'} · ⭐ ${stargazers_count}</p>
      </article>`).join('');
  }
};

const loadProjects = async () => {
  projectsState = { status: 'loading', repos: [], filter: 'all' };
  renderProjects();
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_ID}/repos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`); // 403 레이트 리밋 포함
    const repos = await res.json();
    projectsState = repos.length === 0
      ? { status: 'empty', repos: [], filter: 'all' }
      : { status: 'success', repos, filter: 'all' };
  } catch (err) {
    projectsState = { status: 'error', repos: [], filter: 'all' };
  }
  renderProjects();
};

loadProjects();

/* ===== 폼 유효성 검사 ===== */
const form = document.querySelector('#contact-form');
const successMsg = document.querySelector('#form-success');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validators = {
  name: (v) => (v.trim() ? '' : '이름을 입력해주세요.'),
  email: (v) => {
    if (!v.trim()) return '이메일을 입력해주세요.';
    return emailRegex.test(v) ? '' : '올바른 이메일 형식이 아닙니다.';
  },
  message: (v) => (v.trim() ? '' : '메시지를 입력해주세요.'),
};

const showError = (field, msg) => {
  document.querySelector(`#${field}-error`).textContent = msg;
  document.querySelector(`#${field}`).classList.toggle('invalid', Boolean(msg));
};

const validateField = (field) => {
  const msg = validators[field](document.querySelector(`#${field}`).value);
  showError(field, msg);
  return !msg;
};

Object.keys(validators).forEach((field) => {
  document.querySelector(`#${field}`).addEventListener('input', () => validateField(field));
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const results = Object.keys(validators).map(validateField);
  if (results.every(Boolean)) {
    successMsg.textContent = '문의가 정상적으로 접수되었습니다. 감사합니다!';
    form.reset();
  } else {
    successMsg.textContent = '';
  }
});