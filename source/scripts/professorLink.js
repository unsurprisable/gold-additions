// from utils.js
/* global convertNodeToRmpLink */

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
