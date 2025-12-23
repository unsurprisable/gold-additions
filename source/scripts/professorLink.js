// from utils.js
/* global convertNodeToRmpLink */

// copied from studentSchedule.js, not sure if this is necessary
// eslint-disable-next-line no-unused-vars
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  /**
   * div
   * └─ label.visible-xs ("Instructor") <- instructorLabels[i]
   * └─ "MIRZA D" <- target
   */
  const instructorLabels = Array.from(document.querySelectorAll('label.visible-xs'))
    .filter(label => label.textContent === 'Instructor');

  instructorLabels.forEach(label => {
    convertNodeToRmpLink(label.nextSibling);
  });
})();
