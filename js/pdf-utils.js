function groupHonorsForPdf(awards) {
  const groups = [];
  const byIdentity = new Map();

  (awards || []).forEach(award => {
    const title = String(award?.title || '').trim();
    const organization = String(award?.organization || '').trim();
    const key = `${title}\u0000${organization}`;
    let group = byIdentity.get(key);

    if (!group) {
      group = { title, organization, awards: [] };
      byIdentity.set(key, group);
      groups.push(group);
    }

    group.awards.push(award);
  });

  return groups;
}

function formatHonorDatesForPdf(awards) {
  const dates = (awards || []).map(award => String(award?.date || '').trim()).filter(Boolean);
  return dates.length ? `Recognitions: ${dates.join(' · ')}` : '';
}

if (typeof window !== 'undefined') {
  window.PdfUtils = { groupHonorsForPdf, formatHonorDatesForPdf };
}

if (typeof module !== 'undefined') {
  module.exports = { groupHonorsForPdf, formatHonorDatesForPdf };
}
