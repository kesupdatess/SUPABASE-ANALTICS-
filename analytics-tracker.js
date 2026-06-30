// KES UPDATES - SUPABASE ANALYTICS TRACKER
const ANALYTICS_SUPABASE_URL = 'https://uegdizdnminwhkxcdcle.supabase.co';
const ANALYTICS_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZ2RpemRubWlud2hreGNkY2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODk2MjgsImV4cCI6MjA5NzY2NTYyOH0.2wiAHbaoNoDva_tRseDAywVMu_6AioCGlVLgoVb0d6s';

let analyticsClient = null;

function initAnalytics() {
  if (typeof supabase === 'undefined') {
    console.warn('⚠️ Supabase SDK not loaded');
    return;
  }
  analyticsClient = supabase.createClient(ANALYTICS_SUPABASE_URL, ANALYTICS_SUPABASE_KEY);
  console.log('📊 KES Analytics initialized');
}

function getOrCreateSession() {
  let sid = sessionStorage.getItem('kes_session_id');
  if (!sid) {
    sid = 'kes_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('kes_session_id', sid);
    initSession(sid);
  }
  return sid;
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function parseUserAgent() {
  const ua = navigator.userAgent;
  let browser = 'Unknown', os = 'Unknown';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg/.test(ua)) browser = 'Edge';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  return { browser, os };
}

function getUTMParams() {
  const params = new URLSearchParams(location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
}

async function initSession(sid) {
  if (!analyticsClient) return;
  const { browser, os } = parseUserAgent();
  const utm = getUTMParams();
  await analyticsClient.from('analytics_sessions').insert({
    session_id: sid,
    user_agent: navigator.userAgent,
    device_type: getDeviceType(),
    browser, os,
    screen_resolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    referrer: document.referrer,
    ...utm,
  });
}

let pageStartTime = Date.now();
let maxScroll = 0;

async function trackPageView() {
  if (!analyticsClient) return;
  const now = Date.now();
  await analyticsClient.from('analytics_page_views').insert({
    session_id: getOrCreateSession(),
    url: location.href,
    path: location.pathname,
    title: document.title,
    referrer: document.referrer,
    time_on_page: Math.round((now - pageStartTime) / 1000),
    scroll_depth: maxScroll,
  });
  pageStartTime = now;
  maxScroll = 0;
}

window.addEventListener('load', () => setTimeout(trackPageView, 100));
window.addEventListener('popstate', trackPageView);

window.addEventListener('scroll', () => {
  const scrolled = Math.round(
    (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
  );
  if (scrolled > maxScroll) maxScroll = scrolled;
});

window.addEventListener('beforeunload', async () => {
  if (!analyticsClient) return;
  await analyticsClient.from('analytics_page_views').insert({
    session_id: getOrCreateSession(),
    url: location.href,
    path: location.pathname,
    title: document.title,
    time_on_page: Math.round((Date.now() - pageStartTime) / 1000),
    scroll_depth: maxScroll,
  });
});

document.addEventListener('click', async (e) => {
  if (!analyticsClient) return;
  const el = e.target.closest('a, button, input, [data-track]');
  if (!el) return;
  await analyticsClient.from('analytics_clicks').insert({
    session_id: getOrCreateSession(),
    url: location.href,
    element_tag: el.tagName.toLowerCase(),
    element_id: el.id || null,
    element_class: (typeof el.className === 'string' ? el.className : '') || null,
    element_text: (el.innerText || el.value || '').slice(0, 200),
    element_href: el.href || null,
    x_position: Math.round(e.clientX),
    y_position: Math.round(e.clientY),
  });
  if (el.dataset.track) {
    await trackEvent('custom_click', el.dataset.track, el.dataset.track);
  }
});

async function trackEvent(name, category, label, value = null, metadata = {}) {
  if (!analyticsClient) return;
  await analyticsClient.from('analytics_events').insert({
    session_id: getOrCreateSession(),
    event_name: name,
    event_category: category,
    event_action: name,
    event_label: label,
    event_value: value,
    metadata,
  });
}

window.trackEvent = trackEvent;

document.addEventListener('click', async (e) => {
  if (e.target.closest('#donateBarBtn')) {
    await trackEvent('donation_click', 'Donation', 'Bottom Bar - Plant Now', 1);
  }
});

document.addEventListener('click', async (e) => {
  const notice = e.target.closest('.notice-card');
  if (notice) {
    const title = notice.querySelector('.notice-title')?.innerText || 'Unknown';
    await trackEvent('notice_click', 'Notices', title);
  }
});

document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[href*="mastersofterp"]');
  if (link) {
    await trackEvent('erp_click', 'ERP', link.innerText.trim());
  }
});

document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[href*="ourlib"]');
  if (link) {
    await trackEvent('library_click', 'Library', link.innerText.trim());
  }
});

document.addEventListener('input', async (e) => {
  if (e.target.id === 'searchInput') {
    const query = e.target.value.trim();
    if (query.length > 2) {
      await trackEvent('search', 'Search', query);
    }
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.closest('#themeBtn')) {
    const isDark = document.body.classList.contains('dark');
    await trackEvent('theme_toggle', 'UI', isDark ? 'Dark Mode' : 'Light Mode');
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.action?.includes('formspree')) {
    await trackEvent('feedback_submit', 'Feedback', 'Form Submitted');
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.closest('.instagram-btn')) {
    await trackEvent('instagram_follow', 'Social', 'Instagram Button');
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.closest('.whatsapp-btn')) {
    await trackEvent('whatsapp_share', 'Social', 'WhatsApp Share');
  }
});

window.addEventListener('error', async (e) => {
  if (!analyticsClient) return;
  await analyticsClient.from('analytics_errors').insert({
    session_id: getOrCreateSession(),
    message: e.message,
    source: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
    url: location.href,
  });
});

window.addEventListener('unhandledrejection', async (e) => {
  if (!analyticsClient) return;
  await analyticsClient.from('analytics_errors').insert({
    session_id: getOrCreateSession(),
    message: e.reason?.message || String(e.reason),
    stack: e.reason?.stack,
    url: location.href,
  });
});

window.addEventListener('load', () => {
  setTimeout(async () => {
    if (!analyticsClient) return;
    const perf = performance.getEntriesByType('navigation')[0];
    if (perf) {
      await analyticsClient.from('analytics_performance').insert({
        session_id: getOrCreateSession(),
        url: location.href,
        dom_loaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
        page_loaded: Math.round(perf.loadEventEnd - perf.startTime),
      });
    }
  }, 1000);
});

(function() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = initAnalytics;
  document.head.appendChild(script);
})();

getOrCreateSession();
console.log('📊 KES Updates Analytics Tracker Loaded');
