(() => {
  console.log("Student Schedule");

  const scheduleItems = document.querySelectorAll(
    '.scheduleItem'
  )
  
  scheduleItems.forEach(schedule => {
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

        const profName = profTextNode?.textContent.trim();
        if (profName && profNameIsValid(profName)) {
          const link = createRmpLink(profName);
          profTextNode.replaceWith(link);
        }
      }
    })
  });
})();