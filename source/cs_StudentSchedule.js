
(() => {
  console.log("Student Schedule");

  const scheduleItems = document.querySelectorAll(
    '.scheduleItem'
  )
  
  scheduleItems.forEach(schedule => {
    const course = schedule.querySelector('.courseTitle');
    const subjectArea = course ? course.textContent.trim().split(' ')[0] : '';

    const possibleInstructorLabels = schedule.querySelectorAll('label.visible-xs')
    possibleInstructorLabels.forEach(label => {
      if (label.textContent.trim() === "Instructor") {
        const instructorLabel = label.parentElement;

        let profTextNode = null;
        instructorLabel.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            profTextNode = node;
          }
        });

        const profName = profTextNode?.textContent;
        if (profName && profNameIsValid(profName)) {
          const link = createRmpLink(profName, subjectArea);
          profTextNode.replaceWith(link);
        }
      }
    })
  });

  function profNameIsValid(profName) {
    const invalidNames = ['cancel', 't.b.a', 't.b.a.'];
    const name = profName.toLowerCase().trim();
    return !invalidNames.includes(name);
  }

  function createRmpLink(profName) {
    const searchParams = encodeURIComponent(`${profName}`)
    const ratemyprofURL = `https://www.ratemyprofessors.com/search/professors/1077?q=${searchParams}`;

    const link = document.createElement('a');
    link.href = ratemyprofURL;
    link.rel = 'noopener noreferrer';
    link.textContent = `${profName}`;
    link.target = '_blank';
    link.style = "white-space: nowrap;"

    return link;
  }
})();