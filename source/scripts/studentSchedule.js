/* global chrome */

// for compatibility with the 'lit-html' VSCode extension (i dont feel like importing the library)
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  console.log('Student Schedule');

  // ===== Configuration =====
  const SETTINGS_ANIMATION_TIME = 300; // ms - not synced with ics-settings.css

  // ===== DOM References =====
  const scheduleContainer = document.querySelector('#div_Schedule_Container');

  // ===== Export Button Setup =====
  const hrElement = scheduleContainer.querySelector('hr');
  hrElement.style = 'margin-top: 10px';

  const exportButtonHtml = html`
    <div id="gold-export-container" style="display: inline-block; text-align: center; margin-top: 15px">
      <a id="gold-export-button" class="gold-button" role="button" href="#">Export Schedule to Calendar</a>
      <div id="gold-export-subtitle" style="color: gray; margin-top: 3px; font-size: 14px;">Google, Outlook, Apple (.ics)</div>
    </div>
  `;
  hrElement.insertAdjacentHTML('beforebegin', exportButtonHtml);

  const exportButton = scheduleContainer.querySelector('#gold-export-button');
  exportButton.addEventListener('click', (event) => {
    event.preventDefault();
    showCalendarContext();
  });

  // ===== Backdrop & Modal Helpers =====
  const backdrop = document.createElement('div');
  backdrop.id = 'ics-settings-backdrop';
  backdrop.className = 'menu-hidden';
  document.body.appendChild(backdrop);

  function showCalendarContext() {
    backdrop.classList.remove('menu-hidden');
    backdrop.classList.add('menu-visible');
  }

  function hideCalendarContext() {
    backdrop.classList.remove('menu-visible');
    setTimeout(() => backdrop.classList.add('menu-hidden'), SETTINGS_ANIMATION_TIME);
  }

  // user settings (assigned when download button is pressed)
  let SHORT_COURSE_NAMES = null;
  let QUARTER_START_YEAR = null;
  let QUARTER_START_MONTH = null;
  let QUARTER_START_DAY = null;
  let QUARTER_END_YEAR = null;
  let QUARTER_END_MONTH = null;
  let QUARTER_END_DAY = null;

  // ===== Settings Modal Setup =====
  // load HTML content asynchronously
  (async () => {
    try {
      const response = await fetch(chrome.runtime.getURL('html/ics-settings.html'));
      const modalHtml = await response.text();
      backdrop.insertAdjacentHTML('beforeend', modalHtml);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('css/ics-settings.css');
      document.head.appendChild(link);

      const startDateInput = document.getElementById('ics-start-date');
      const endDateInput = document.getElementById('ics-end-date');
      const shortenCheckboxLabel = document.getElementById('shorten-course-checkbox');
      const shortenCheckbox = shortenCheckboxLabel.querySelector('input[type="checkbox"]');
      const downloadButton = document.getElementById('ics-download');
      const cancelButton = document.getElementById('ics-cancel');

      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          hideCalendarContext();
        }
      });

      /** Enable download button only when both dates are filled */
      function checkDownloadButtonRequirements() {
        if (startDateInput.value.trim() !== '' && endDateInput.value.trim() !== '') {
          downloadButton.classList.remove('aspNetDisabled');
        } else {
          downloadButton.classList.add('aspNetDisabled');
        }
      }

      startDateInput.addEventListener('input', checkDownloadButtonRequirements);
      endDateInput.addEventListener('input', checkDownloadButtonRequirements);

      shortenCheckboxLabel.addEventListener('change', () => {
        shortenCheckboxLabel.nextSibling.textContent = shortenCheckbox.checked
          ? ' "MATH 1A" '
          : ' "MATH 1A - LEARNING FRACTIONS 101" ';
      });

      downloadButton.addEventListener('click', (event) => {
        if (downloadButton.classList.contains('aspNetDisabled')) {
          event.preventDefault();
          return; // prob not the best way to do this but wtv
        }
        console.log('Generating ICS file data...');
        getFormInput();
        const icsFileData = generateIcsData();
        downloadCalendar('GOLD Schedule Calendar', icsFileData);
        hideCalendarContext();
      });

      cancelButton.addEventListener('click', (event) => {
        if (!downloadButton.classList.contains('aspNetDisabled')) {
          console.log('Debug: Generating ICS file data...');
          getFormInput();
          generateIcsData();
        } else {
          console.log('Debug: Not generating ICS file data (requirements not met)');
        }
        event.preventDefault();
        hideCalendarContext();
      });

      function getFormInput() {
        SHORT_COURSE_NAMES = shortenCheckbox.checked;
        let [yyyy, mm, dd] = startDateInput.value.split('-');
        QUARTER_START_YEAR = yyyy;
        QUARTER_START_MONTH = mm;
        QUARTER_START_DAY = dd;
        [yyyy, mm, dd] = endDateInput.value.split('-');
        QUARTER_END_YEAR = yyyy;
        QUARTER_END_MONTH = mm;
        QUARTER_END_DAY = dd;
      }

      /**
       * @returns {string}
       */
      function generateIcsData() {
        const meetings = scrapeCourses();
        const icsFileData = Meeting.toIcsCalendar(meetings);
        console.groupCollapsed('ICS File Data');
        console.log(icsFileData);
        console.groupEnd();
        return icsFileData;
      }
    } catch (error) {
      console.error('Failed to load settings HTML:', error);
    }
  })();

  // TODO: use ics.js to make more readable and standardized

  // ===== Data Processing =====
  /**
   * @returns {Meeting[]}
   */
  function scrapeCourses() {
    const meetings = [];
    const currentScheduleItems = scheduleContainer.querySelectorAll('.scheduleItem:not(.unitsSection)');

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
     * >>>>> .childNodes[2...] - raw text data for the above         |
     */
    currentScheduleItems.forEach((scheduleItem) => {
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

        const name = scheduleItem.children[0].textContent.trim().replace(/\s+/g, ' '); // cut out the random extra spaces
        const professor = Array.from(classInfo.children[4].childNodes) // possibility of multiple professors (eg. ENGR 13A)
          .slice(2)
          .map((n) => n.textContent.trim())
          .filter(Boolean)
          .join(', ');
        const days = classInfo.children[0].childNodes[2].textContent.trim();
        const time = classInfo.children[1].childNodes[2].textContent.trim();
        const location = classInfo.children[2].childNodes[2].textContent.trim();
        const courseID = courseInfo.children[0].textContent.trim();
        const grading = courseInfo.children[1].textContent.trim().substring(9); // remove 'Grading: ' prefix
        const units = courseInfo.children[2].textContent.trim().substring(0, 3); // remove ' Units' suffix

        meetings.push(new Meeting(name, professor, days, time, location, courseID, grading, units));
      }
    });

    return meetings;
  }

  /**
   * @typedef {Object} MeetingIcsData
   * @property {string} summary
   * @property {string} dtStart
   * @property {string} dtEnd
   * @property {string} days
   * @property {string} untilDate
   * @property {string} location
   * @property {string} description
   */


  // TODO: Meeting rename to CourseClass, create class FinalExam (sibling?), both implement getMeetingIcsData
  class Meeting {
    static DAY_MAP = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
    static DAY_OFFSET = { M: 0, T: 1, W: 2, R: 3, F: 4 };

    /**
     * Used to store and modify course data in its raw HTML form.
     * 
     * @param {string} name       CMPSC 16 - PROBLEM SOLVING I
     * @param {string} professor  MAJEDI M
     * @param {string} days       M W
     * @param {string} time       2:00 PM-3:15 PM
     * @param {string} location   Harold Frank Hall, 1104
     * @param {string} courseID   07682
     * @param {string} grading    L
     * @param {string} units      4.0
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
     * @param {string} time HH:MM AM/PM
     * @returns {{hours: number, minutes: number}} 24hr format
     */
    convertTime(time) {
      const [, h, m, mer] = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const hours = mer.toUpperCase() === 'PM' ?
        (h === '12' ? 12 : Number(h) + 12) :
        (h === '12' ? 0 : Number(h));
      return { hours, minutes: Number(m) };
    }

    /**
     * 2025-01-25T10:25:30.000Z --> 20250125T102530
     * @param {string} isoDatetime 
     * @returns {string}
     */
    convertISOToICS(isoDatetime) {
      let icsDatetime = isoDatetime.split('.')[0];
      icsDatetime = icsDatetime.replaceAll('-', '');
      icsDatetime = icsDatetime.replaceAll(':', '');
      return icsDatetime;
    }

    /**
     * @returns {MeetingIcsData}
     */
    getMeetingIcsData() {
      const dayMap = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
      const dayOffset = { M: 0, T: 1, W: 2, R: 3, F: 4 };

      const [startTime, endTime] = this.time.split('-').map(t => this.convertTime(t.trim()));
      const days = this.days.split(' ');
      const startDatetime = new Date(Date.UTC(
        parseInt(QUARTER_START_YEAR, 10),
        parseInt(QUARTER_START_MONTH, 10) - 1,
        parseInt(QUARTER_START_DAY, 10),
        startTime.hours,
        startTime.minutes,
      ));
      startDatetime.setUTCDate(startDatetime.getUTCDate() + dayOffset[days[0]]);

      const endDatetime = new Date(startDatetime);
      endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);
      const summary = SHORT_COURSE_NAMES ? this.name.split('-')[0].trim() : this.name;

      return {
        summary,
        dtStart: this.convertISOToICS(startDatetime.toISOString()),
        dtEnd: this.convertISOToICS(endDatetime.toISOString()),
        days: days.map((d) => dayMap[d]).join(','),
        untilDate: `${QUARTER_END_YEAR}${QUARTER_END_MONTH}${QUARTER_END_DAY}T235959`,
        location: this.location,
        description: `Professor: ${this.professor.split('\n').join(', ')}\\nGrading: ${this.grading === 'L' ? 'Letter' : 'Pass/No Pass'}\\nUnits: ${this.units}`,

      };
    }

    /**
     * @returns {string}
     */
    toIcsEvent() {
      const data = this.getMeetingIcsData();
      return `BEGIN:VEVENT
SUMMARY:${data.summary}
DTSTART;TZID=America/Los_Angeles:${data.dtStart}
DTEND;TZID=America/Los_Angeles:${data.dtEnd}
RRULE:FREQ=WEEKLY;BYDAY=${data.days};UNTIL=${data.untilDate}
LOCATION:${data.location}
DESCRIPTION:${data.description}
END:VEVENT`;
    }

    /**
     * @param {Meeting[]} meetings
     * @returns {string}
     */
    static toIcsCalendar(meetings) {
      return `BEGIN:VCALENDAR
VERSION:2.0
${meetings.map((m) => m.toIcsEvent()).join('\n')}
END:VCALENDAR`;
    }
  }

  // ===== Utility =====
  /**
   * @param {string} filename 
   * @param {string} content 
   */
  function downloadCalendar(filename, content) {
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
})();
