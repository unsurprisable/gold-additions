// from utils.js
  /* global profNameIsValid, createRmpLink */

// eslint-disable-next-line no-unused-vars
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  /** @type {Element[]} */
  const scheduleItems = document.querySelectorAll('.scheduleItem');

  const profTextNodes = [];

  // bruh its been like a month and i have no idea what is happening here its so ugly but it works
  scheduleItems.forEach(schedule => {
    // TODO: change the query selector to find by class (col-lg-instructor)
    const possibleInstructorLabels = schedule.querySelectorAll('label.visible-xs');
    possibleInstructorLabels.forEach(label => {
      if (label.textContent.trim() === "Instructor") {
        const instructorLabel = label.parentElement;

        instructorLabel.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            profTextNodes.push(node);
          }
        });
      }
    });
  });

  profTextNodes.forEach(profTextNode => {
    const profName = profTextNode?.textContent.trim();
    if (profName && profNameIsValid(profName)) {
      const link = createRmpLink(profName);
      profTextNode.replaceWith(link);
    }
  });
})();
