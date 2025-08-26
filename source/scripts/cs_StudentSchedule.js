
// for compatibility with the 'lit-html' VSCode extension (i dont feel like importing the library)
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  console.log("Student Schedule");

  // user settings (to be implemented later)
  const SHORT_COURSE_NAMES = true;
  const QUARTER_START_YEAR = '2025';
  const QUARTER_START_MONTH = '01';
  const QUARTER_START_DAY = '01'; // first monday of the quarter
  // end of user settings

  /** @type {Element[]} */
  const scheduleItems = document.querySelectorAll('.scheduleItem');

  /** @type {Element} */
  const scheduleContainer = document.querySelector('#div_Schedule_Container')

  /** @type {Element[]} */
  const currentScheduleItems = scheduleContainer.querySelectorAll('.scheduleItem:not(.unitsSection)')

  let icsFileData = null;

  // Replacing professor names with links
  const profTextNodes = findProfessorNodes();

  profTextNodes.forEach(profTextNode => {
    const profName = profTextNode?.textContent.trim();
      if (profName && profNameIsValid(profName)) {
        const link = createRmpLink(profName);
        profTextNode.replaceWith(link);
      }
  });

  // Calendar button
  const buttonContainer = document.createElement('div');
  buttonContainer.style = "display: inline-block; text-align: center; margin-top: 15px";
  const exportButton = document.createElement('a');
  exportButton.className = 'gold-button';
  exportButton.textContent = "Export Schedule to Calendar";
  exportButton.href = '#';
  const subtitle = document.createElement('div');
  subtitle.style = "color: gray; margin-top: 3px;";
  subtitle.style.fontSize = '14px';
  subtitle.textContent = "Google, Outlook, Apple (.ics)";

  const hrElement = scheduleContainer.querySelector('hr');
  hrElement.style = "margin-top: 10px";
  scheduleContainer.insertBefore(buttonContainer, hrElement);
  buttonContainer.appendChild(exportButton);
  buttonContainer.appendChild(subtitle);

  // Export menu
  SETTINGS_ANIMATION_TIME = 300; //ms

  const backdrop = document.createElement('div');
  backdrop.id = 'ics-settings-backdrop';
  backdrop.className = 'menu-hidden';
  backdrop.innerHTML = html`

    <div id="ics-settings">
      <div id="content" class="legacycontent">
        <h3>Calendar Export Settings</h3>
        <div id="ics-button-container">
          <a id="ics-download" class="gold-button" href="">Download</a>
          <a id="ics-cancel" class="gold-button" href="">Cancel</a>
        </div>
      </div>
    </div>

    <style>
      #ics-settings-backdrop {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity ${SETTINGS_ANIMATION_TIME}ms ease;
        opacity: 0;
      }
      
      #ics-settings-backdrop.menu-visible {
        visibility: visible;
        opacity: 1;
      }
      
      #ics-settings-backdrop.menu-hidden {
        visibility: hidden;
      }

      #ics-settings {
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        padding: 20px;
        border-radius: 10px;
        width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 1;
        transform: translateY(100vh);
      }

      #ics-settings-backdrop.menu-visible #ics-settings {
        transition: transform ${SETTINGS_ANIMATION_TIME}ms cubic-bezier(.03,.89,.04,.98);
        transform: translateY(0);
      }
        
      #ics-button-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
      }
    </style>
  `;

  document.body.appendChild(backdrop);



  exportButton.addEventListener('click', (event) => {
    event.preventDefault(); // prevent from refreshing
    showCalendarContext();
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      hideCalendarContext();
    }
  });

  document.getElementById('ics-download').addEventListener('click', (event) => {
    event.preventDefault();
    if (icsFileData) {
      console.log("Retrieving calendar data...")
    } else {
      console.log("Generating calendar...");
      const meetings = scrapeCourses();
      icsFileData = meetingsToICS(meetings);
    }
    console.groupCollapsed('ICS File Data');
    console.log(icsFileData);
    console.groupEnd();

    downloadCalendar('GOLD Schedule Calendar', icsFileData);
    hideCalendarContext();
  });

  document.getElementById('ics-cancel').addEventListener('click', (event) => {
    event.preventDefault();
    hideCalendarContext();
  });

  function showCalendarContext() {
    backdrop.classList.remove('menu-hidden');
    backdrop.classList.add('menu-visible')
  }
  function hideCalendarContext() {
    backdrop.classList.remove('menu-visible');
    setTimeout(() => {
      backdrop.classList.add('menu-hidden');
    }, SETTINGS_ANIMATION_TIME);
  }



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
   * @returns {Meeting[]} 
   * */
  function scrapeCourses() {

    /** @type {Meeting[]} */
    let meetings = [];

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
      
        meetings.push(new Meeting(name, professor, days, time, location, courseID, grading, units));
      };
    });
    
    return meetings;
  }

  /**
   * @param {string} filename 
   * @param {string} content 
   */
  function downloadCalendar(filename, content) {
    const blob = new Blob([content], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }



  /**
   * @typedef {Object} MeetingIcsData
   * @property {string} summary
   * @property {string} dtStart
   * @property {string} dtEnd
   * @property {string} days
   * @property {string} location
   * @property {string} description
   */

  class Meeting {
    /**
     * @param {string} name
     * @param {string} professor
     * @param {string} days
     * @param {string} time
     * @param {string} location
     * @param {string} courseID
     * @param {string} grading
     * @param {string} units
     */
    constructor(name, professor, days, time, location, courseID, grading, units) {
      this.name = name;
      this.professor = professor;
      this.days = days;
      this.time = time;
      this.location = location;
      this.courseID = courseID;
      this.grading = grading;
      this.units = units;
    }

    /**
     * "HH:mm [A/P]M" --> "YYYYMMDDTHHmmss"
     * @param {string} time
     * @returns {string}
     */
    getIcsTime(time) {
      let hours = time.substring(0, time.indexOf(':'));
      if (hours !== "12" && time.split(' ')[1] === 'PM') {
        const adjustedHours = parseInt(hours, 10) + 12;
        hours = adjustedHours.toString();
      }
      let minutes = time.substring(time.indexOf(':')+1, time.indexOf(' '));

      return `${QUARTER_START_YEAR}${QUARTER_START_MONTH}${QUARTER_START_DAY}T${hours}${minutes}00`;
    }

    /**
     * @param {string} days
     * @returns {string}
     */
    getIcsDays(days) {
      const dayMap = {
        M: "MO",
        T: "TU",
        W: "WE",
        R: "TH",
        F: "FR",
      }

      return days.split(' ').map(d => dayMap[d]).join(',');
    }

    /**
     * @returns {MeetingIcsData}
     */
    getMeetingIcsData() {
      /**
       * @type {MeetingIcsData}
       */
      const data = {};
      
      data.summary = this.name;
      if (SHORT_COURSE_NAMES) {
        const hyphenIndex = this.name.indexOf('-');
        if (hyphenIndex) {
          data.summary = this.name.substring(0, hyphenIndex-1);
        }
      }
      data.dtStart = this.getIcsTime(this.time.substring(0, this.time.indexOf('-')));
      data.dtEnd = this.getIcsTime(this.time.substring(this.time.indexOf('-')+1));
      data.days = this.getIcsDays(this.days);
      data.location = this.location;
      data.description = `Professor: ${this.professor}\\nGrading: ${this.grading === 'L' ? 'Letter' : 'Pass/No Pass'}\\nUnits: ${this.units}`;

      return data;
    }
  }

  /**
   * @param {Meeting} meeting 
   * @return {string}
   */
  function meetingToIcsEvent(meeting) {
    const data = meeting.getMeetingIcsData();
    return `BEGIN:VEVENT
SUMMARY:${data.summary}
DTSTART;TZID=America/Los_Angeles:${data.dtStart}
DTEND;TZID=America/Los_Angeles:${data.dtEnd}
RRULE:FREQ=WEEKLY;BYDAY=${data.days}
LOCATION:${data.location}
DESCRIPTION:${data.description}
END:VEVENT`;
  }

  /**
   * @param {Meeting[]} meetings 
   * @return {string}
   */
  function meetingsToICS(meetings) {
    return `BEGIN:VCALENDAR
VERSION:2.0
${meetings.map(meetingToIcsEvent).join('\n')}
END:VCALENDAR`;
  }



})();