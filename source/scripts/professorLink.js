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
   * └─ "HOELLE J" <- target
   * 
   * Note: not 100% safe, could break if the structure changes
   */
  const instructorLabels = Array.from(document.querySelectorAll('label.visible-xs'))
    .filter(label => label.textContent === 'Instructor');
  
  instructorLabels.forEach(label => {
    label.parentNode.childNodes.forEach(node => {
      if (!(node.nodeType === Node.ELEMENT_NODE && node.matches('label.visible-xs'))) {
        convertNodeToRmpLink(node);
      }
    });
  });
})();
