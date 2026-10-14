const test = require('node:test');
const assert = require('node:assert/strict');

let groupHonorsForPdf;
let formatHonorDatesForPdf;
try {
  ({ groupHonorsForPdf, formatHonorDatesForPdf } = require('../js/pdf-utils.js'));
} catch {
  groupHonorsForPdf = undefined;
  formatHonorDatesForPdf = undefined;
}

test('groups honors sharing a title and organization while retaining every occurrence', () => {
  assert.equal(typeof groupHonorsForPdf, 'function');

  const awards = [
    { title: 'Game Changer Award', organization: 'Vodafone Oman', date: 'May 2026', description: 'Latest achievement' },
    { title: 'Game Changer Award', organization: 'Vodafone Oman', date: 'June 2025', description: 'Earlier achievement' },
    { title: 'Chairman Champion Team Award', organization: 'Vodafone Oman', date: 'March 2023', description: 'Team achievement' }
  ];

  assert.deepEqual(groupHonorsForPdf(awards), [
    {
      title: 'Game Changer Award',
      organization: 'Vodafone Oman',
      awards: [awards[0], awards[1]]
    },
    {
      title: 'Chairman Champion Team Award',
      organization: 'Vodafone Oman',
      awards: [awards[2]]
    }
  ]);
});

test('keeps awards separate when either title or organization differs', () => {
  assert.equal(typeof groupHonorsForPdf, 'function');

  const awards = [
    { title: 'Award A', organization: 'Company One' },
    { title: 'Award A', organization: 'Company Two' },
    { title: 'Award B', organization: 'Company One' }
  ];

  assert.equal(groupHonorsForPdf(awards).length, 3);
});

test('formats grouped award dates as a compact recognition history', () => {
  assert.equal(typeof formatHonorDatesForPdf, 'function');
  assert.equal(
    formatHonorDatesForPdf([
      { date: 'May 2026' },
      { date: 'June 2025' },
      { date: 'July 2024' },
      { date: 'May 2024' }
    ]),
    'Recognitions: May 2026 · June 2025 · July 2024 · May 2024'
  );
});
