// from utils.js
/* global SEARCH_URL */


// Link to UCSB Plat?

(() => {
  /**
   * div
   * └─ label.visible-xs ("Instructor") <- instructorLabels[i]
   * └─ "MIRZA D" <- target
   */
  const instructorLabels = Array.from(document.querySelectorAll('label.visible-xs'))
    .filter(label => label.textContent === 'Instructor');

  instructorLabels.forEach(label => {
    label.parentElement.childNodes.forEach(node => {
      if (node !== label) convertNodeToRmpLink(node);
    });
  });
})();


function profNameIsValid(profName) {
  const name = profName.toLowerCase().trim();
  const INVALID_PROF_NAMES = ['cancel', 't.b.a', 't.b.a.', '', null];
  return !INVALID_PROF_NAMES.includes(name);
}

function createRmpLink(profName) {
  const ratemyprofURL = SEARCH_URL + encodeURIComponent(profName);

  const link = document.createElement('a');
  link.href = ratemyprofURL;
  link.rel = 'noopener noreferrer';
  link.textContent = `${profName}`;
  link.target = '_blank';
  link.style = "white-space: nowrap;";

  return link;
}

function convertNodeToRmpLink(node) {
  const profName = node?.textContent?.trim();
  if (profName && profNameIsValid(profName)) {
    const link = createRmpLink(profName);
    node.replaceWith(link);
  }
}
