(() => {
  console.log("Student Schedule");

  // user settings (to be implemented later)
  const SHORT_COURSE_NAMES = true;
  // end of user settings

  /** @type {Element[]} */
  const scheduleItems = document.querySelectorAll('.scheduleItem');

  /** @type {Element} */
  const scheduleContainer = document.querySelector('#div_Schedule_Container')

  /** @type {Element[]} */
  const currentScheduleItems = scheduleContainer.querySelectorAll('.scheduleItem:not(.unitsSection)')

  // Replacing professor names with links
  const profTextNodes = findProfessorNodes();

  profTextNodes.forEach(profTextNode => {
    const profName = profTextNode?.textContent.trim();
      if (profName && profNameIsValid(profName)) {
        const link = createRmpLink(profName);
        profTextNode.replaceWith(link);
      }
  });

  // Adding Calendar button
  const button = document.createElement('button');
  button.textContent = 'Generate Calendar';
  button.style.marginTop = '20px';

  button.addEventListener('click', (event) => {
    event.preventDefault(); // prevent from refreshing
    console.log('Generating calendar...');
    console.log(scrapeCourses(currentScheduleItems));
    console.log("calendar generated");
  });

  const hrElement = scheduleContainer.querySelector('hr');
  scheduleContainer.insertBefore(button, hrElement);



  /**
   * @returns {ChildNode[]}
   */
  function findProfessorNodes() {
    const profNodes = [];

    // bruh its been like a month and i have no idea what is happening here its so ugly but it works
    scheduleItems.forEach(schedule => {
      const possibleInstructorLabels = schedule.querySelectorAll('label.visible-xs')
      possibleInstructorLabels.forEach(label => {
        if (label.textContent.trim() === "Instructor") {
          const instructorLabel = label.parentElement;

          instructorLabel.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              profNodes.push(node);
            }
          });
        }
      })
    });
    
    return profNodes;
  }

  /** 
   * @returns {Course[]} 
   * */
  function scrapeCourses() {

    /** @type {Course[]} */
    let courses = [];

    /**
     * FOR FUTURE REFERENCE:
     * Hiearchy starting from scheduleItem:
     * 
     * > .children[0] - {course name}                                |
     * > .children[1] - all course information                       |
     * >> .children[0]                                               |
     * >>> .children[0]                                              | courseInfo
     * >>>> .children[0,1,2] - {course ID, grading type, units}      | 
     * >> .children[1] - list of all enrolled lectures/sections      | classes
     * >>> .children[*]                                              |
     * >>>> .children[0,1,2,4] - {days, time, location, professor}   |
     * >>>>> .childNodes[2] - raw text data for the above            |
     */
    currentScheduleItems.forEach(scheduleItem => {
      const courseInfo = scheduleItem.children[1].children[0].children[0];
      const classes = scheduleItem.children[1].children[1];

      /** 
       * necessary for distinguishing between Lectures & Sections 
       * (so that they have separate events on the calendar)
       * if the student is in ONLY a lecture or ONLY a section,
       * it'll just loop once so it doesn't really matter
       */
      for (let i = 0; i < classes.children.length; i++) {
        const classInfo = classes.children[i];

        let name = scheduleItem.children[0].textContent.trim().replace(/\s+/g, ' '); // cut out the random extra spaces
        let professor = classInfo.children[4].childNodes[2].textContent.trim();
        let days = classInfo.children[0].childNodes[2].textContent.trim();
        let time = classInfo.children[1].childNodes[2].textContent.trim();
        let location = classInfo.children[2].childNodes[2].textContent.trim();
        let courseID = courseInfo.children[0].textContent.trim();
        let grading = courseInfo.children[1].textContent.trim().substring(9); // remove 'Grading: ' prefix
        let units = courseInfo.children[2].textContent.trim().substring(0, 3); // remove ' Units' suffix
      
        courses.push({name, professor, days, time, location, courseID, grading, units});
      };
    });
    
    return courses;
  }

})();