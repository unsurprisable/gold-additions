/* global CalendarEvent, CourseClass, FinalExam, ImportantDate, QUARTER_DATE_FIELDS */

const settings = {
  includeFinals: {
    default: true,
    current: true,
    checkboxSelector: '#include-finals-checkbox input[type="checkbox"]',
    toggleTextSelector: '#finals-toggle-text',
    checkboxElement: null,
    toggleTextElement: null,
  },
  shortenNames: {
    default: true,
    current: true,
    checkboxSelector: '#shorten-course-checkbox input[type="checkbox"]',
    toggleTextSelector: '#shorten-toggle-text',
    checkboxElement: null,
    toggleTextElement: null,
  },
  includeDescriptions: {
    default: false,
    current: false,
    checkboxSelector: '#include-description-checkbox input[type="checkbox"]',
    toggleTextSelector: '#description-toggle-text',
    checkboxElement: null,
    toggleTextElement: null,
  },
  includeQuarterInfo: {
    default: true,
    current: true,
    checkboxSelector: '#include-quarter-checkbox input[type="checkbox"]',
    toggleTextSelector: '#include-quarter-toggle-text',
    checkboxElement: null,
    toggleTextElement: null,
  },
};

(() => {
  console.log('Student Schedule');

  const SETTINGS_ANIMATION_TIME = 300; // ms - not synced with ics-settings.css

  const scheduleContainer = document.querySelector('#div_Schedule_Container');

  const currentQuarterOption = document.querySelector('#ctl00_pageContent_quarterDropDown option[selected="selected"]');
  const PAGE_QUARTER_ID = currentQuarterOption?.getAttribute('value')?.trim() || '';
  const PAGE_QUARTER_NAME = currentQuarterOption?.textContent?.trim() || '';
  let QUARTERS_CACHE = {};

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
    // for some reason GOLD uses <a> for buttons, so we used the same style
    event.preventDefault();
    showCalendarContext();
  });

  // ===== Backdrop Setup =====
  document.body.insertAdjacentHTML('beforeend', '<div id="ics-settings-backdrop" class="menu-hidden"></div>');
  const backdrop = document.getElementById('ics-settings-backdrop');
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      hideCalendarContext();
    }
  });

  // ===== Settings Modal Setup =====
  // load HTML content asynchronously
  (async () => {
    // Load HTML
    const response = await fetch(chrome.runtime.getURL('html/ics-settings.html'));
    const modalHtml = await response.text();
    backdrop.insertAdjacentHTML('beforeend', modalHtml);

    // Load CSS
    const cssLink = document.getElementById('ics-settings-css');
    cssLink.href = chrome.runtime.getURL('css/ics-settings.css');

    // Cache DOM elements for all settings
    Object.entries(settings).forEach(([, config]) => {
      config.checkboxElement = document.querySelector(config.checkboxSelector);
      config.toggleTextElement = document.querySelector(config.toggleTextSelector);
    });

    // Update checkbox status to its display text
    Object.entries(settings).forEach(([, config]) => {
      config.checkboxElement.addEventListener('change', () => {
        config.toggleTextElement.classList.toggle('checked', config.checkboxElement.checked);
        config.current = config.checkboxElement.checked;
      });
    });

    // Refresh once on setup
    refreshQuarterUI();

    // Refresh UI when quarter info is updated in storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.quarters) {
        refreshQuarterUI();
      }
    });

    // Apply saved settings from storage
    chrome.storage.local.get('icsSettings', (result) => {
      const newSettings = { ...getDefaultSettings(), ...(result?.icsSettings || {}) };
      applySettings(newSettings);
    });

    const downloadButton = document.getElementById('ics-download');
    const resetButton = document.getElementById('ics-reset');
    const cancelButton = document.getElementById('ics-cancel');

    downloadButton.addEventListener('click', (event) => {
      if (downloadButton.classList.contains('aspNetDisabled')) {
        event.preventDefault();
        return; // prob not the best way to do this but wtv
      }
      const icsFileData = generateIcsData();
      downloadCalendar('GOLD Schedule Calendar.ics', icsFileData);
      console.log('Downloaded ICS file.');
      saveIcsSettings();
      hideCalendarContext();
    });

    resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('Resetting to default settings...');
      applySettings(getDefaultSettings());
    });

    cancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      hideCalendarContext();
    });

  })();

  // ===== Data Processing =====

  /** @returns {string} */
  function generateIcsData() {
    const events = scrapeCourses();

    // Append quarter important date events if enabled and available
    const quarterInfo = QUARTERS_CACHE[PAGE_QUARTER_ID];
    if (settings.includeQuarterInfo.current && quarterInfo) {
      Object.entries(quarterInfo).forEach(([key, value]) => {
        if (QUARTER_DATE_FIELDS[key]) {
          events.push(new ImportantDate(QUARTER_DATE_FIELDS[key].name, value));
        }
      });
    }

    const icsFileData = CalendarEvent.toIcsCalendar(events);
    console.groupCollapsed('ICS File Data');
    console.log(icsFileData);
    console.groupEnd();
    return icsFileData;
  }

  // TODO: separate MW classes into two events
  // TODO: standardize scraping

  /**
  * Scrape the schedule page for all course and final exam event data.
  * @returns {CalendarEvent[]}
   */
  function scrapeCourses() {
    const events = [];

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

        events.push(new CourseClass(name, professor, days, time, location, courseID, grading, units));
      }

    });

    // ===== Final Exams =====

    if (settings.includeFinals.current) {
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
        // sometimes the field says stuff like "Contact Professor for Final Exam Information"
        if (FinalExam.DATETIME_REGEX.test(datetime)) {
          events.push(new FinalExam(name, datetime));
        }
      });
    }

    return events;
  }

  // ===== Helpers =====

  /** Read quarter data from storage and update the UI accordingly. */
  function refreshQuarterUI() {
    const quarterLabel = document.getElementById('ics-quarter-label');
    quarterLabel.textContent = PAGE_QUARTER_NAME;
    chrome.storage.local.get(['quarters'], (result) => {
      QUARTERS_CACHE = result.quarters || {};
      // Update warning visibility
      const q = QUARTERS_CACHE[PAGE_QUARTER_ID];
      const quarterWarning = document.getElementById('ics-quarter-warning');
      const downloadButton = document.getElementById('ics-download');

      // Update download button state and CourseClass quarter date info
      if (q) {
        CourseClass.QUARTER_START_DATE = ImportantDate.toDate(q.start);
        CourseClass.QUARTER_END_DATE = ImportantDate.toDate(q.end);
        quarterWarning.style.display = 'none';
        downloadButton.classList.remove('aspNetDisabled');
      } else {
        quarterWarning.style.display = '';
        downloadButton.classList.add('aspNetDisabled');
      }
    });
  }

  function showCalendarContext() {
    backdrop.classList.remove('menu-hidden');
    backdrop.classList.add('menu-visible');
  }

  function hideCalendarContext() {
    backdrop.classList.remove('menu-visible');
    setTimeout(() => backdrop.classList.add('menu-hidden'), SETTINGS_ANIMATION_TIME);
  }

  /** @returns {Object} Object with all settings set to their default values */
  function getDefaultSettings() {
    return Object.fromEntries(
      Object.entries(settings).map(([key, config]) => [key, config.default])
    );
  }

  /** @returns {Object} Object with all current setting values */
  function getCurrentSettings() {
    return Object.fromEntries(
      Object.entries(settings).map(([key, config]) => [key, config.current])
    );
  }

  /** @param {{includeFinals: boolean, shortenNames: boolean, includeDescriptions: boolean, includeQuarterInfo: boolean}} newSettings */
  function applySettings(newSettings) {
    Object.entries(newSettings).forEach(([key, value]) => {
      const config = settings[key];
      config.checkboxElement.checked = value;
      config.toggleTextElement.classList.toggle('checked', value);
      config.current = value;
    });
  }

  /** Save the current ICS settings to Chrome storage. */
  function saveIcsSettings() {
    chrome.storage.local.set({ icsSettings: getCurrentSettings() });
  }

  /**
   * @param {string} filename
   * @param {string} content
   */
  function downloadCalendar(filename, content) {
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    // script can't download directly, so using temporary link
    document.body.insertAdjacentHTML('beforeend', `<a href="${url}" download="${filename}"></a>`);
    const link = document.body.lastElementChild;

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // for compatibility with the 'lit-html' VSCode extension (i dont feel like importing the library)
  /**
   * @param {TemplateStringsArray} strings
   * @param {...any} values
   * @returns {string}
   */
  function html(strings, ...values) {
    return strings.reduce((result, str, i) => result + str + (values[i] || ''), '');
  }
})();
