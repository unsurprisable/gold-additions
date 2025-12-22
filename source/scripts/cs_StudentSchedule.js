/* global chrome */

// for compatibility with the 'lit-html' VSCode extension (i dont feel like importing the library)
// eslint-disable-next-line no-unused-vars
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  console.log("Student Schedule");

  // user settings (assigned when download button is pressed)
  let SHORT_COURSE_NAMES = null;
  let QUARTER_START_YEAR = null;
  let QUARTER_START_MONTH = null;
  let QUARTER_START_DAY = null;
  let QUARTER_END_YEAR = null;
  let QUARTER_END_MONTH = null;
  let QUARTER_END_DAY = null;

  /** @type {Element} */
  const scheduleContainer = document.querySelector('#div_Schedule_Container')

  /** @type {Element[]} */
  const currentScheduleItems = scheduleContainer.querySelectorAll('.scheduleItem:not(.unitsSection)')

  // Calendar button
  const buttonContainer = document.createElement('div');
  buttonContainer.style = "display: inline-block; text-align: center; margin-top: 15px";
  const exportButton = document.createElement('a');
  exportButton.className = 'gold-button';
  exportButton.textContent = "Export Schedule to Calendar";
  exportButton.href = '#';
  const subtitle = document.createElement('div');
  subtitle.style = "color: gray; margin-top: 3px";
  subtitle.style.fontSize = '14px';
  subtitle.textContent = "Google, Outlook, Apple (.ics)";

  const hrElement = scheduleContainer.querySelector('hr');
  hrElement.style = "margin-top: 10px";
  scheduleContainer.insertBefore(buttonContainer, hrElement);
  buttonContainer.appendChild(exportButton);
  buttonContainer.appendChild(subtitle);

  // Export menu
  const SETTINGS_ANIMATION_TIME = 300;//ms

  const backdrop = document.createElement('div');
  backdrop.id = 'ics-settings-backdrop';
  backdrop.className = 'menu-hidden';

  // Load settings HTML asynchronously
  (async () => {
    try {
      const response = await fetch(chrome.runtime.getURL('html/ics-settings.html'));
      const html = await response.text();
      backdrop.innerHTML = html;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('css/ics-settings.css');
      backdrop.appendChild(link);

      // Setup event listeners after HTML is loaded
      const startDateInput = document.getElementById('ics-start-date');
      const endDateInput = document.getElementById('ics-end-date');
      const shortenCheckboxLabel = document.getElementById('shorten-course-checkbox');
      const shortenCheckbox = shortenCheckboxLabel.querySelector('input[type="checkbox"]');
      const downloadButton = document.getElementById('ics-download');
      const cancelButton = document.getElementById('ics-cancel');

      exportButton.addEventListener('click', (event) => {
        event.preventDefault();// prevent from refreshing
        showCalendarContext();
      });

      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          hideCalendarContext();
        }
      });

      startDateInput.addEventListener('input', checkDownloadButtonRequirements);
      endDateInput.addEventListener('input', checkDownloadButtonRequirements);

      function checkDownloadButtonRequirements() {
        if (startDateInput.value.trim() !== '' && endDateInput.value.trim() !== '') {
          downloadButton.classList.remove('aspNetDisabled');
        } else {
          downloadButton.classList.add('aspNetDisabled');
        }
      }

      shortenCheckboxLabel.addEventListener('change', () => {
        if (shortenCheckbox.checked) {
          shortenCheckboxLabel.nextSibling.textContent = ` "MATH 1A" `;
        } else {
          shortenCheckboxLabel.nextSibling.textContent = ` "MATH 1A - LEARNING FRACTIONS 101" `;
        }
      });

      downloadButton.addEventListener('click', (event) => {
        if (downloadButton.classList.contains('aspNetDisabled')) {
          event.preventDefault();
          return;// prob not the best way to do this but wtv
        }
        console.log("Generating calendar...");
        const icsFileData = generateIcsData();
        downloadCalendar('GOLD Schedule Calendar', icsFileData);
        hideCalendarContext();
      });

      cancelButton.addEventListener('click', (event) => {
        event.preventDefault();
        hideCalendarContext();
        console.log("[DEBUG] Generating calendar...");
        generateIcsData();
      });

      function generateIcsData() {
        SHORT_COURSE_NAMES = shortenCheckbox.checked;
        let [yyyy, mm, dd] = startDateInput.value.split('-');
        QUARTER_START_YEAR = yyyy;
        QUARTER_START_MONTH = mm;
        QUARTER_START_DAY = dd;
        [yyyy, mm, dd] = endDateInput.value.split('-');
        QUARTER_END_YEAR = yyyy;
        QUARTER_END_MONTH = mm;
        QUARTER_END_DAY = dd;

        const meetings = scrapeCourses();
        const icsFileData = meetingsToICS(meetings);
        console.groupCollapsed('ICS File Data');
        console.log(icsFileData);
        console.groupEnd();
        return icsFileData;
      }
    } catch (error) {
      console.error('Failed to load settings HTML:', error);
    }
  })();

  document.body.appendChild(backdrop);

  function showCalendarContext() {
    console.log("Showing calendar settings...");
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

        let name = scheduleItem.children[0].textContent.trim().replace(/\s+/g, ' ');// cut out the random extra spaces
        let professor = classInfo.children[4].childNodes[2].textContent.trim();
        let days = classInfo.children[0].childNodes[2].textContent.trim();
        let time = classInfo.children[1].childNodes[2].textContent.trim();
        let location = classInfo.children[2].childNodes[2].textContent.trim();
        let courseID = courseInfo.children[0].textContent.trim();
        let grading = courseInfo.children[1].textContent.trim().substring(9); // remove 'Grading: ' prefix
        let units = courseInfo.children[2].textContent.trim().substring(0, 3);// remove ' Units' suffix

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
    const blob = new Blob([ content ], {type : "text/calendar"});
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
   * @property {string} untilDate
   * @property {string} location
   * @property {string} description
   */

  class Meeting {
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
     * Converts "HH:mm PM" to {hours, minutes} in 24hr time
     * @param {string} time 
     * @returns {{hours: number, minutes: number}}
     */
    convertTime(time) {
      let separatorIndex = time.indexOf(':');
      let hours = parseInt(time.substring(0, separatorIndex));
      let minutes = parseInt(time.substring(separatorIndex + 1, separatorIndex + 3));

      // convert 12 hour clock to 24 hour clock
      if (hours !== 12 && time.split(' ')[1] === 'PM') {
        hours += 12;
      } else if (hours === "12" && time.split(' ')[1] === 'AM') {
        hours = 0;
      }

      return {hours : hours, minutes : minutes};
    }

    /**
     * 2025-00-25T10:25:30.000Z --> 20250125T102530
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
      /**
       * @type {MeetingIcsData}
       */
      const data = {};

      data.summary = this.name;
      if (SHORT_COURSE_NAMES) {
        const hyphenIndex = this.name.indexOf('-');
        if (hyphenIndex) {
          data.summary = this.name.substring(0, hyphenIndex - 1);
        }
      }

      const dayMap = {
        M : {day : "MO", daysFromMon : 0},
        T : {day : "TU", daysFromMon : 1},
        W : {day : "WE", daysFromMon : 2},
        R : {day : "TH", daysFromMon : 3},
        F : {day : "FR", daysFromMon : 4}
      }

      const startTime = this.convertTime(this.time.substring(0, this.time.indexOf('-')));
      const startDatetime = new Date();
      startDatetime.setUTCFullYear(parseInt(QUARTER_START_YEAR), parseInt(QUARTER_START_MONTH) - 1, parseInt(QUARTER_START_DAY));
      startDatetime.setUTCHours(startTime.hours, startTime.minutes, 0, 0);

      // avoid bug where all events get stacked onto the first monday
      const firstDayOffset = dayMap[this.days.split(' ')[0]].daysFromMon;
      startDatetime.setUTCDate(startDatetime.getUTCDate() + firstDayOffset);

      console.log(this.name, startDatetime.toISOString());

      const endTime = this.convertTime(this.time.substring(this.time.indexOf('-') + 1));
      const endDatetime = new Date(startDatetime);
      endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);

      data.dtStart = this.convertISOToICS(startDatetime.toISOString());
      data.dtEnd = this.convertISOToICS(endDatetime.toISOString());
      data.days = this.days.split(' ').map(d => dayMap[d].day).join(',')
      data.untilDate = `${QUARTER_END_YEAR}${QUARTER_END_MONTH}${QUARTER_END_DAY}T235959`
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
RRULE:FREQ=WEEKLY;BYDAY=${data.days};UNTIL=${data.untilDate}
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
