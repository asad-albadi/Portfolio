// Two-column CV generator (jsPDF) — dark sidebar + main column, modern styling.
// Pulls from the same /data JSON the site uses. No truncation of descriptions.

document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations, obs) => {
    const btn = document.getElementById('download-cv-btn');
    if (!btn) return;
    obs.disconnect();

    btn.addEventListener('click', async () => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
      try {
        const [profile, about, resume, honors] = await Promise.all(
          ['profile', 'about', 'resume', 'honors'].map(n => fetch(`data/${n}.json`).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch ${n}.json`);
            return r.json();
          }))
        );
        if (typeof window.jspdf === 'undefined') throw new Error('jsPDF not loaded');
        await generatePdf({ profile, about, resume, honors }, window.jspdf.jsPDF);
      } catch (err) {
        console.error('Error generating PDF:', err);
        alert('Failed to generate the CV. Please try again.');
      } finally {
        btn.innerHTML = original;
        btn.disabled = false;
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Circular-cropped PNG data URL from a same-origin image.
function circleAvatar(url, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        const r = Math.max(size / img.width, size / img.height);
        const w = img.width * r, h = img.height * r;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(c.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function generatePdf(data, jsPDF) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297

  // Palette
  const INK = '#0a0e14';        // sidebar background
  const MINT = '#5be6c4';       // sidebar accent
  const SIDE = '#e6eaf0';       // sidebar text
  const SIDE_DIM = '#9aa6b5';   // sidebar secondary
  const TEXT = '#1f2430';       // main text
  const TEAL = '#0e7c66';       // main accent
  const MUTE = '#6b7280';       // main secondary
  const RULE = '#d8dce2';       // main hairline

  // Geometry
  const SBW = 64;               // sidebar width
  const SBP = 9;                // sidebar padding
  const SX = SBP, STW = SBW - SBP * 2;   // sidebar text x / width
  const MX = SBW + 10;          // main x
  const MW = W - MX - 14;       // main width
  const TOP = 15;

  let sy = TOP, my = TOP;
  const font = (s, st = 'normal') => { doc.setFont('helvetica', st); doc.setFontSize(s); };
  const mm = (s, lh = 1) => s * 0.3528 * lh;
  const clean = s => String(s || '').replace(/\s*\([^)]*\)/g, '').trim();

  // Sidebar full-height background
  doc.setFillColor(INK);
  doc.rect(0, 0, SBW, H, 'F');

  // ---- sidebar helpers ----
  function sideLabel(label) {
    sy += 5;
    font(8.5, 'bold'); doc.setTextColor(MINT);
    doc.text(label.toUpperCase(), SX, sy);
    sy += 1.6;
    doc.setDrawColor(MINT); doc.setLineWidth(0.3);
    doc.line(SX, sy, SX + STW, sy);
    sy += 4;
  }
  function sideText(text, { size = 8, color = SIDE, style = 'normal', lh = 1.3, gap = 0 } = {}) {
    if (!text) return;
    font(size, style); doc.setTextColor(color);
    const lines = doc.splitTextToSize(String(text), STW);
    const step = mm(size, lh);
    lines.forEach((ln, i) => doc.text(ln, SX, sy + i * step));
    sy += lines.length * step + gap;
  }

  // ---- main helpers ----
  function mainLabel(label) {
    my += 6;
    font(10, 'bold'); doc.setTextColor(TEAL);
    doc.text(label.toUpperCase(), MX, my);
    my += 2;
    doc.setDrawColor(RULE); doc.setLineWidth(0.3);
    doc.line(MX, my, MX + MW, my);
    my += 5.5;
  }
  function mainText(text, { size = 9.5, color = TEXT, style = 'normal', lh = 1.34, x = MX, w = MW, gap = 0 } = {}) {
    if (!text) return;
    font(size, style); doc.setTextColor(color);
    const lines = doc.splitTextToSize(String(text), w);
    const step = mm(size, lh);
    lines.forEach((ln, i) => doc.text(ln, x, my + i * step));
    my += lines.length * step + gap;
  }

  // ================= SIDEBAR =================
  // Avatar (circular, mint ring)
  try {
    const av = await circleAvatar(data.profile.avatar);
    const r = 16, cx = SBW / 2, cy = TOP + r;
    doc.addImage(av, 'PNG', cx - r, cy - r, r * 2, r * 2);
    doc.setDrawColor(MINT); doc.setLineWidth(1);
    doc.circle(cx, cy, r, 'S');
    sy = cy + r + 2;
  } catch (e) { sy = TOP; }

  // Contact
  const ci = data.profile.contactInfo || [];
  const find = k => (ci.find(c => (c.icon || '').includes(k)) || {}).text;
  const li = (data.profile.socialLinks || []).find(s => (s.icon || '').includes('linkedin'));
  sideLabel('Contact');
  [find('fa-envelope'), find('fa-phone'), find('fa-map-marker'),
   li && li.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), data.profile.website]
    .filter(Boolean).forEach(t => sideText(t, { color: SIDE_DIM, gap: 1.5 }));

  // Technical skills (grouped)
  const groups = (data.resume.technicalSkills || []).filter(g => g && Array.isArray(g.skills));
  if (groups.length) {
    sideLabel('Skills');
    groups.forEach(g => {
      sideText(g.category, { size: 8, style: 'bold', color: SIDE, gap: 0.5 });
      sideText(g.skills.map(s => clean(s.name)).join(', '), { size: 8, color: SIDE_DIM, gap: 2.5 });
    });
  }

  // Soft skills
  const soft = (data.resume.softSkills || []).map(s => clean(s.name));
  if (soft.length) {
    sideLabel('Soft Skills');
    sideText(soft.join(', '), { color: SIDE_DIM });
  }

  // Languages
  const langs = data.resume.languages || [];
  if (langs.length) {
    sideLabel('Languages');
    langs.forEach(l => {
      sideText(l.language, { size: 8, style: 'bold', color: SIDE });
      sideText(String(l.proficiency).replace(/\s*proficiency/i, ''), { size: 7.5, color: SIDE_DIM, gap: 1.8 });
    });
  }

  // Education
  const edu = (data.resume.education || [])[0];
  if (edu) {
    sideLabel('Education');
    sideText(edu.degree, { size: 8, style: 'bold', color: SIDE });
    sideText([edu.institution, edu.period].filter(Boolean).join(' · '), { size: 7.5, color: SIDE_DIM });
  }

  // ================= MAIN =================
  // Name + title
  font(23, 'bold'); doc.setTextColor(TEXT);
  doc.text(data.profile.name, MX, my + 7);
  font(12, 'normal'); doc.setTextColor(TEAL);
  doc.text(data.profile.title, MX, my + 14);
  my += 18;

  // Summary (full, no truncation)
  if (data.about && data.about.description) {
    mainLabel(data.about.title || 'Summary');
    mainText(data.about.description, { color: TEXT, lh: 1.36 });
  }

  // Experience (full descriptions)
  const jobs = data.resume.experience || [];
  if (jobs.length) {
    mainLabel('Experience');
    jobs.forEach((job, i) => {
      font(10.5, 'bold'); doc.setTextColor(TEXT);
      doc.text(job.title, MX, my);
      font(8.5, 'normal'); doc.setTextColor(MUTE);
      doc.text(job.period || '', MX + MW, my, { align: 'right' });
      my += mm(10.5, 1.2);
      mainText(job.company, { size: 9.5, color: TEAL, lh: 1.2, gap: 0.5 });
      mainText(job.description, { size: 9, color: MUTE, lh: 1.32 });
      if (i < jobs.length - 1) my += 3.5;
    });
  }

  // Certifications & courses — latest two per category
  const certCats = (data.resume.certifications || []).filter(c => c && Array.isArray(c.items) && c.items.length);
  if (certCats.length) {
    mainLabel('Certifications & Courses');
    certCats.forEach(cat => {
      mainText(cat.category, { size: 9, style: 'bold', color: TEXT, gap: 1 });
      cat.items.slice(0, 2).forEach(it => {
        doc.setFillColor(TEAL); doc.circle(MX + 1.1, my - 1.1, 0.7, 'F');
        mainText(it, { size: 8.8, color: MUTE, x: MX + 4.5, w: MW - 4.5, lh: 1.3, gap: 1.2 });
      });
      my += 2;
    });
  }

  // Honors & Awards — repeat awards are grouped by title + organization,
  // with a compact history of every recognition date.
  const awards = (data.honors && data.honors.awards) || [];
  const honorGroups = window.PdfUtils.groupHonorsForPdf(awards);
  if (honorGroups.length) {
    mainLabel((data.honors && data.honors.title) || 'Honors & Awards');
    honorGroups.forEach((group, groupIndex) => {
      font(9.5, 'bold'); doc.setTextColor(TEXT);
      doc.text(group.title, MX, my);
      font(8.5, 'normal'); doc.setTextColor(MUTE);
      doc.text(group.organization, MX + MW, my, { align: 'right' });
      my += mm(9.5, 1.35);

      mainText(window.PdfUtils.formatHonorDatesForPdf(group.awards), {
        size: 8.2, color: MUTE, lh: 1.2, gap: 0.8
      });

      if (groupIndex < honorGroups.length - 1) my += 1;
    });
  }

  doc.save(`${String(data.profile.name || 'CV').replace(/\s+/g, '_')}_CV.pdf`);
}
