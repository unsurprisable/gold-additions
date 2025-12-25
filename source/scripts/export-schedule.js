/* global chrome */

// for compatibility with the 'lit-html' VSCode extension (i dont feel like importing the library)
/**
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {string}
 */
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
}

(() => {
  console.log('Student Schedule');

  const SETTINGS_ANIMATION_TIME = 300; // ms - not synced with ics-settings.css

  const scheduleContainer = document.querySelector('#div_Schedule_Container');

  const currentQuarterOption = document.querySelector('#ctl00_pageContent_quarterDropDown option[selected="selected"]');
  const PAGE_QUARTER_ID = currentQuarterOption?.getAttribute('value')?.trim() || '';
  const PAGE_QUARTER_NAME = currentQuarterOption?.textContent?.trim() || '';

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

  const DEFAULT_SETTINGS = {
    includeFinals: true,
    shortenNames: true,
    includeDescriptions: false,
  };

  // user settings (assigned when download button is pressed)
  let INCLUDE_FINALS = null;
  let SHORT_COURSE_NAMES = null;
  let INCLUDE_DESCRIPTIONS = null;
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

      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
          hideCalendarContext();
        }
      });

      const quarterLabel = document.getElementById('ics-quarter-label');
      const quarterWarning = document.getElementById('ics-quarter-warning');
      let QUARTERS_CACHE = {};

      const startDateInput = document.getElementById('ics-start-date');
      const endDateInput = document.getElementById('ics-end-date');

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

      const finalsCheckbox = document.querySelector('#include-finals-checkbox input[type="checkbox"]');
      const finalsToggleText = document.getElementById('finals-toggle-text');
      finalsCheckbox.addEventListener('change', () => {
        finalsToggleText.classList.toggle('checked', finalsCheckbox.checked);
      });

      const shortenCheckbox = document.querySelector('#shorten-course-checkbox input[type="checkbox"]');
      const shortenToggleText = document.getElementById('shorten-toggle-text');
      shortenCheckbox.addEventListener('change', () => {
        shortenToggleText.classList.toggle('checked', shortenCheckbox.checked);
      });

      const descriptionCheckbox = document.querySelector('#include-description-checkbox input[type="checkbox"]');
      const descriptionToggleText = document.getElementById('description-toggle-text');
      descriptionCheckbox.addEventListener('change', () => {
        descriptionToggleText.classList.toggle('checked', descriptionCheckbox.checked);
      });

      // Update date inputs based on selected quarter
      /**
       * @param {string} quarterId
       */
      function setDateInputsForQuarter(quarterId) {
        const q = QUARTERS_CACHE[quarterId];
        if (q &&
          typeof q.start === 'string' && q.start.match(/^\d{4}-\d{2}-\d{2}$/) &&
          typeof q.end === 'string' && q.end.match(/^\d{4}-\d{2}-\d{2}$/)) {
          if (startDateInput.value !== q.start) startDateInput.value = q.start;
          if (endDateInput.value !== q.end) endDateInput.value = q.end;
          if (quarterWarning) quarterWarning.style.display = 'none';
        } else {
          if (startDateInput.value !== '') startDateInput.value = '';
          if (endDateInput.value !== '') endDateInput.value = '';
          if (quarterWarning) quarterWarning.style.display = '';
        }
        checkDownloadButtonRequirements();
      }

      // Build the quarter dropdown from storage, defaulting to current page selection
      function refreshQuarterUI() {
        if (quarterLabel) quarterLabel.textContent = PAGE_QUARTER_NAME;
        chrome.storage.local.get(['quarters'], (result) => {
          QUARTERS_CACHE = result.quarters || {};
          setDateInputsForQuarter(PAGE_QUARTER_ID);
        });
      }

      // Refresh quarter UI once on setup
      refreshQuarterUI();

      // Listen for storage changes from the Registration page and refresh when returning
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;
          if (changes.quarters) {
            refreshQuarterUI();
          }
        });
      }

      /**
       * @param {{includeFinals: boolean, shortenNames: boolean, includeDescriptions: boolean}} settings
       */
      function applySettings(settings) {
        finalsCheckbox.checked = settings.includeFinals;
        finalsToggleText.classList.toggle('checked', settings.includeFinals);
        shortenCheckbox.checked = settings.shortenNames;
        shortenToggleText.classList.toggle('checked', settings.shortenNames);
        descriptionCheckbox.checked = settings.includeDescriptions;
        descriptionToggleText.classList.toggle('checked', settings.includeDescriptions);
      }

      /** Save the current ICS settings to Chrome storage. */
      function saveIcsSettings() {
        console.log('Saving ICS settings...');
        // console.log(chrome?.storage?.local)
        if (!chrome?.storage?.local) return;
        console.log('ICS settings saved to local storage.');
        chrome.storage.local.set({
          icsSettings: {
            includeFinals: INCLUDE_FINALS,
            shortenNames: SHORT_COURSE_NAMES,
            includeDescriptions: INCLUDE_DESCRIPTIONS,
          },
        });
      }

      if (chrome?.storage?.local) {
        chrome.storage.local.get('icsSettings', (result) => {
          const settings = { ...DEFAULT_SETTINGS, ...(result?.icsSettings || {}) };
          applySettings(settings);
        });
      } else {
        applySettings(DEFAULT_SETTINGS);
      }

      const downloadButton = document.getElementById('ics-download');
      const cancelButton = document.getElementById('ics-cancel');

      downloadButton.addEventListener('click', (event) => {
        if (downloadButton.classList.contains('aspNetDisabled')) {
          event.preventDefault();
          return; // prob not the best way to do this but wtv
        }
        console.log('Generating ICS file data...');
        getFormInput();
        const icsFileData = generateIcsData();
        downloadCalendar('GOLD Schedule Calendar.ics', icsFileData);
        saveIcsSettings();
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

      /** Read form input fields and update global settings variables. */
      function getFormInput() {
        INCLUDE_FINALS = finalsCheckbox.checked;
        SHORT_COURSE_NAMES = shortenCheckbox.checked;
        INCLUDE_DESCRIPTIONS = descriptionCheckbox.checked;
        let [yyyy, mm, dd] = startDateInput.value.split('-');
        QUARTER_START_YEAR = yyyy;
        QUARTER_START_MONTH = mm;
        QUARTER_START_DAY = dd;
        [yyyy, mm, dd] = endDateInput.value.split('-');
        QUARTER_END_YEAR = yyyy;
        QUARTER_END_MONTH = mm;
        QUARTER_END_DAY = dd;
      }

      /** @returns {string} */
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

  // ===== Data Processing =====
  /**
   * Scrape the schedule page for all course and final exam meeting data.
   * @returns {Meeting[]}
   */
  function scrapeCourses() {
    const meetings = [];

    // ===== Lectures and Sections =====

    const scheduleItems = scheduleContainer.querySelectorAll('.scheduleItem:not(.unitsSection)');

    /*
     * FOR FUTURE REFERENCE:
     * Hierarchy starting from scheduleItem:
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
    scheduleItems.forEach((scheduleItem) => {
      const courseInfo = scheduleItem.children[1].children[0].children[0];
      const classes = scheduleItem.children[1].children[1];

      /*
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

        meetings.push(new CourseClass(name, professor, days, time, location, courseID, grading, units));
      }

    });

    // ===== Final Exams =====

    if (INCLUDE_FINALS) {
      // last line is a note (weird design)
      const finalExamSection = Array.from(document.querySelectorAll('.row.finalBlock')).slice(0, -1);
      /*
       * hiearchy starting from examItem:
       * 
       * > .children[0] - {course name}       
       * > .children[1] - {exam date & time}
       */
      finalExamSection.forEach((examItem) => {
        const name = examItem.children[0].textContent.trim().replace(/\s+/g, ' ');
        const datetime = examItem.children[1].textContent.trim();
        if (FinalExam.DATETIME_REGEX.test(datetime)) {
          meetings.push(new FinalExam(name, datetime));
        }
      });
    }

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

  /**
   * Abstract base class for calendar events
   * Provides ICS generation utilities and interface for subclasses
   */
  class Meeting {
    static DAY_MAP = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
    static DAY_OFFSET = { M: 0, T: 1, W: 2, R: 3, F: 4 };
    /**
     * @param {string} time HH:MM AM/PM
     * @returns {{hours: number, minutes: number}} 24hr format
     */
    static to24Hour(time) {
      const [, h, m, mer] = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const hours = mer.toUpperCase() === 'PM' ?
        (h === '12' ? 12 : Number(h) + 12) :
        (h === '12' ? 0 : Number(h));
      return { hours, minutes: Number(m) };
    }

    /**
     * Convert a Date to ICS datetime (UTC) without separators.
     * @param {Date} date Date(2025-01-25T10:25:30.000Z)
     * @returns {string} 20250125T102530
     */
    static dateToIcsString(date) {
      const iso = date.toISOString();
      let icsDatetime = iso.split('.')[0];
      icsDatetime = icsDatetime.replaceAll('-', '');
      icsDatetime = icsDatetime.replaceAll(':', '');
      return icsDatetime;
    }

    /**
     * Escape text for ICS: backslash (except for "\n" sequences), comma, semicolon
     * @param {string} text
     * @returns {string}
     */
    static escapeText(text) {
      if (text == null) return '';
      return String(text)
        .replace(/\\(?!n)/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
    }

    /**
     * Generate a simple unique ID for a calendar object.
     * @returns {string}
     */
    static generateUid() {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}@gold-additions`;
    }

    /**
     * Must be implemented by subclasses
     * @returns {MeetingIcsData}
     */
    getMeetingIcsData() {
      throw new Error('getMeetingIcsData must be implemented by subclass');
    }

    /**
     * Must be implemented by subclasses
     * @returns {string}
     */
    toIcsEvent() {
      throw new Error('toIcsEvent must be implemented by subclass');
    }

    /**
     * @param {Meeting[]} events
     * @returns {string}
     */
    static toIcsCalendar(events) {
      const body = events.map((e) => e.toIcsEvent()).join('\n');
      const vtimezone = [
        'BEGIN:VTIMEZONE',
        'TZID:America/Los_Angeles',
        'X-LIC-LOCATION:America/Los_Angeles',
        'BEGIN:DAYLIGHT',
        'TZOFFSETFROM:-0800',
        'TZOFFSETTO:-0700',
        'TZNAME:PDT',
        'DTSTART:19700308T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
        'END:DAYLIGHT',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:-0700',
        'TZOFFSETTO:-0800',
        'TZNAME:PST',
        'DTSTART:19701101T020000',
        'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
        'END:STANDARD',
        'END:VTIMEZONE'
      ].join('\n');
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//gold-additions//UCSB GOLD Export//EN',
        vtimezone,
        body,
        'END:VCALENDAR'
      ].join('\n');
    }
  }

  /** Represents a recurring course meeting (lecture/section) */
  class CourseClass extends Meeting {
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
      super();
      this.name = name;
      this.professor = professor;
      this.days = days;
      this.time = time;
      this.location = location;
      this.courseID = courseID;
      this.grading = grading;
      this.units = units;
    }

    /** @returns {MeetingIcsData} */
    getMeetingIcsData() {
      const [startTime, endTime] = this.time.split('-').map(t => Meeting.to24Hour(t.trim()));
      const days = this.days.split(' ');
      const startDatetime = new Date(Date.UTC(
        Number(QUARTER_START_YEAR),
        Number(QUARTER_START_MONTH) - 1,
        Number(QUARTER_START_DAY),
        startTime.hours,
        startTime.minutes,
      ));
      startDatetime.setUTCDate(startDatetime.getUTCDate() + Meeting.DAY_OFFSET[days[0]]);

      const endDatetime = new Date(startDatetime);
      endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);
      const summary = SHORT_COURSE_NAMES ? this.name.split('-')[0].trim() : this.name;

      // Compute UNTIL as end of quarter date in UTC (23:59:59Z)
      const untilUtc = new Date(Date.UTC(
        Number(QUARTER_END_YEAR),
        Number(QUARTER_END_MONTH) - 1,
        Number(QUARTER_END_DAY),
        23, 59, 59
      ));

      return {
        summary,
        dtStart: Meeting.dateToIcsString(startDatetime),
        dtEnd: Meeting.dateToIcsString(endDatetime),
        days: days.map((d) => Meeting.DAY_MAP[d]).join(','),
        untilDate: `${Meeting.dateToIcsString(untilUtc)}Z`,
        location: this.location,
        description: INCLUDE_DESCRIPTIONS ? `Professor: ${this.professor.split('\n').join(', ')}` : '',
      };
    }

    /** @returns {string} */
    toIcsEvent() {
      const data = this.getMeetingIcsData();
      const uid = Meeting.generateUid();
      const dtStamp = `${Meeting.dateToIcsString(new Date())}Z`;
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${Meeting.escapeText(data.summary)}`,
        `DTSTART;TZID=America/Los_Angeles:${data.dtStart}`,
        `DTEND;TZID=America/Los_Angeles:${data.dtEnd}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${data.days};UNTIL=${data.untilDate}`,
        `LOCATION:${Meeting.escapeText(data.location)}`,
        `DESCRIPTION:${Meeting.escapeText(data.description)}`,
        'END:VEVENT'
      ].join('\n');
    }
  }

  /** Represents a final exam (single non-recurring event) */
  class FinalExam extends Meeting {
    static DATETIME_REGEX = /^\w+,\s+(\w+)\s+(\d+),\s+(\d{4})\s+(.+)$/;
    /**
     * @param {string} name       CMPSC 16 - PROBLEM SOLVING I
     * @param {string} datetime   Thursday, March 19, 2026 12:00 PM - 3:00 PM
     */
    constructor(name, datetime) {
      super();
      this.name = name;
      this.datetime = datetime;
    }

    /** @returns {MeetingIcsData} */
    getMeetingIcsData() {
      // Parse: "Thursday, March 19, 2026 12:00 PM - 3:00 PM"
      const monthMap = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };

      // Extract components: DayOfWeek, Month Day, Year Time - Time
      const match = this.datetime.match(FinalExam.DATETIME_REGEX);
      if (!match) {
        throw new Error(`Invalid datetime format: ${this.datetime}`);
      }
      const [, monthName, day, year, timeRange] = match;
      const [startTimeStr, endTimeStr] = timeRange.split('-').map(t => t.trim());

      const startTime = Meeting.to24Hour(startTimeStr);
      const endTime = Meeting.to24Hour(endTimeStr);

      const startDatetime = new Date(Date.UTC(
        Number(year),
        monthMap[monthName],
        Number(day),
        startTime.hours,
        startTime.minutes,
      ));

      const endDatetime = new Date(startDatetime);
      endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);

      const summary = SHORT_COURSE_NAMES ? `${this.name.split('-')[0].trim()} - Final Exam` : `${this.name} - Final Exam`;

      return {
        summary,
        dtStart: Meeting.dateToIcsString(startDatetime),
        dtEnd: Meeting.dateToIcsString(endDatetime),
        days: '', // Not used for single events
        untilDate: '', // Not used for single events
        location: '',
        description: '',
      };
    }

    /** @returns {string} */
    toIcsEvent() {
      const data = this.getMeetingIcsData();
      const uid = Meeting.generateUid();
      const dtStamp = `${Meeting.dateToIcsString(new Date())}Z`;
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${Meeting.escapeText(data.summary)}`,
        `DTSTART;TZID=America/Los_Angeles:${data.dtStart}`,
        `DTEND;TZID=America/Los_Angeles:${data.dtEnd}`,
        `LOCATION:${Meeting.escapeText(data.location)}`,
        `DESCRIPTION:${Meeting.escapeText(data.description)}`,
        'END:VEVENT'
      ].join('\n');
    }
  }

  // ===== Utility =====
  /**
   * @param {string} filename
   * @param {string} content
   */
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
