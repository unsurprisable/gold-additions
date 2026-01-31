/* exported CalendarEvent, CourseClass, FinalExam, ImportantDate */
/* global settings */

/**
 * @typedef {Object} EventIcsData
 * @property {string} summary
 * @property {string} dtStart
 * @property {string} dtEnd
 * @property {string} days
 * @property {string} untilDate
 * @property {string} location
 * @property {string} description
 */

/**
 * Abstract base class for calendar events, povides ICS generation utilities and interface for subclasses
 */
class CalendarEvent {
  static MONTH_MAP = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
  };

  /**
   * @param {string} time HH:MM AM/PM
   * @returns {{hours: number, minutes: number}} 24hr format
   */
  static to24Hour(time) {
    const TIME_REGEX = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i;
    if (!TIME_REGEX.test(time)) {
      throw new Error(`Invalid time format: ${time}`);
    }
    const [, h, m, mer] = time.trim().match(TIME_REGEX);
    const hours = mer.toUpperCase() === 'PM' ?
      (h === '12' ? 12 : Number(h) + 12) :
      (h === '12' ? 0 : Number(h));
    return { hours, minutes: Number(m) };
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
   * Convert a Date to ICS datetime (local) without separators.
   * @param {Date} date Date(2025-01-25T10:25:30.000Z)
   * @returns {string} 20250125T102530
   */
  static dateToIcs(date) {
    return date.toISOString()
      .split('.')[0]
      .replaceAll('-', '')
      .replaceAll(':', '');
  }

  /**
   * Format a SUMMARY property line.
   * @param {string} summary
   * @returns {string}
   */
  static formatSummary(summary) {
    return `SUMMARY:${CalendarEvent.escapeText(summary)}`;
  }

  /**
   * Format a LOCATION property line.
   * @param {string} location
   * @returns {string}
   */
  static formatLocation(location) {
    return `LOCATION:${CalendarEvent.escapeText(location)}`;
  }

  /**
   * Format a DESCRIPTION property line.
   * @param {string} description
   * @returns {string}
   */
  static formatDescription(description) {
    return `DESCRIPTION:${CalendarEvent.escapeText(description)}`;
  }

  /**
   * Format DTSTART/DTEND with timezone.
   * @param {string} property - 'DTSTART' or 'DTEND'
   * @param {string} datetime - ICS formatted datetime
   * @param {string} [timezone='America/Los_Angeles'] - Timezone ID
   * @returns {string}
   */
  static formatDateTime(property, datetime, timezone = 'America/Los_Angeles') {
    return `${property};TZID=${timezone}:${datetime}`;
  }

  /**
   * Format DTSTART/DTEND as all-day date.
   * @param {string} property - 'DTSTART' or 'DTEND'
   * @param {string} date - ICS formatted date (YYYYMMDD)
   * @returns {string}
   */
  static formatDate(property, date) {
    return `${property};VALUE=DATE:${date}`;
  }

  /**
   * Generate a simple unique ID for a calendar object.
   * @returns {string}
   */
  static generateUid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}@gold-additions`;
  }

  /**
   * Generate DTSTAMP for ICS events (current timestamp in UTC).
   * @returns {string}
   */
  static generateDtStamp() {
    return `${CalendarEvent.dateToIcs(new Date())}Z`;
  }

  /**
   * Returns data needed for ICS event generation.
   * @returns {EventIcsData}
   */
  parseEventIcsData() {
    throw new Error('parseEventIcsData must be implemented by subclass');
  }

  /**
   * Build the event-specific lines for the ICS event.
   * @param {EventIcsData} data - The event data
   * @returns {string[]} Array of ICS property lines
   */
  // eslint-disable-next-line no-unused-vars
  buildEventLines(data) {
    throw new Error('buildEventLines must be implemented by subclass');
  }

  /**
   * Creates the ICS event string for this event.
   * @returns {string}
   */
  toIcsEvent() {
    const data = this.parseEventIcsData();
    const uid = CalendarEvent.generateUid();
    const dtStamp = CalendarEvent.generateDtStamp();

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      ...this.buildEventLines(data),
      'END:VEVENT'
    ].join('\n');
  }

  /**
  * @param {CalendarEvent[]} events
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

/** Represents a recurring course event (lecture/section) */
class CourseClass extends CalendarEvent {
  static DAY_MAP = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
  static DAY_OFFSET = { M: 0, T: 1, W: 2, R: 3, F: 4 };
  static QUARTER_START_DATE = null;
  static QUARTER_END_DATE = null;

  /**
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

  /** @returns {EventIcsData} */
  parseEventIcsData() {
    const [startTime, endTime] = this.time.split('-').map(t => CalendarEvent.to24Hour(t.trim()));
    const days = this.days.split(' ');

    const startDatetime = new Date(CourseClass.QUARTER_START_DATE);
    startDatetime.setUTCHours(startTime.hours, startTime.minutes, 0, 0);
    startDatetime.setUTCDate(startDatetime.getUTCDate() + CourseClass.DAY_OFFSET[days[0]]);

    const endDatetime = new Date(startDatetime);
    endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);

    // Compute UNTIL as end of quarter date in UTC (23:59:59Z)
    const untilUtc = new Date(CourseClass.QUARTER_END_DATE);
    untilUtc.setUTCHours(23, 59, 59, 0);

    return {
      summary: settings.shortenNames.current ? this.name.split('-')[0].trim() : this.name,
      dtStart: CalendarEvent.dateToIcs(startDatetime),
      dtEnd: CalendarEvent.dateToIcs(endDatetime),
      days: days.map((d) => CourseClass.DAY_MAP[d]).join(','),
      untilDate: `${CalendarEvent.dateToIcs(untilUtc)}Z`,
      location: this.location,
      description: settings.includeDescriptions.current ? `Instructor: ${this.professor.split('\n').join(', ')}` : '',
    };
  }

  /**
   * @param {EventIcsData} data
   * @returns {string[]}
   */
  buildEventLines(data) {
    return [
      CalendarEvent.formatSummary(data.summary),
      CalendarEvent.formatDateTime('DTSTART', data.dtStart),
      CalendarEvent.formatDateTime('DTEND', data.dtEnd),
      `RRULE:FREQ=WEEKLY;BYDAY=${data.days};UNTIL=${data.untilDate}`,
      CalendarEvent.formatLocation(data.location),
    ].concat(
      data.description ? [CalendarEvent.formatDescription(data.description)] : []
    );
  }
}

/** Represents a final exam (single non-recurring event) */
class FinalExam extends CalendarEvent {
  // eg. Thursday, March 19, 2026 12:00 PM - 3:00 PM
  static DATETIME_REGEX = /^[A-Za-z]+,\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/;
  
  /**
   * @param {string} name       CMPSC 16 - PROBLEM SOLVING I
   * @param {string} datetime   Thursday, March 19, 2026 12:00 PM - 3:00 PM
   */
  constructor(name, datetime) {
    super();
    this.name = name;
    this.datetime = datetime;
  }

  /** @returns {EventIcsData} */
  parseEventIcsData() {
    // Parse: "Thursday, March 19, 2026 12:00 PM - 3:00 PM"
    // Extract components: DayOfWeek, Month Day, Year Time - Time
    if (!FinalExam.DATETIME_REGEX.test(this.datetime)) {
      throw new Error(`Invalid datetime format: ${this.datetime}`);
    }
    const [, monthName, day, year, startTimeStr, endTimeStr] = this.datetime.match(FinalExam.DATETIME_REGEX);

    const startTime = CalendarEvent.to24Hour(startTimeStr);
    const endTime = CalendarEvent.to24Hour(endTimeStr);

    const startDatetime = new Date(Date.UTC(
      Number(year),
      CalendarEvent.MONTH_MAP[monthName],
      Number(day),
      startTime.hours,
      startTime.minutes,
    ));

    const endDatetime = new Date(startDatetime);
    endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);

    const summary = settings.shortenNames.current ? `${this.name.split('-')[0].trim()} - Final Exam` : `${this.name} - Final Exam`;

    return {
      summary,
      dtStart: CalendarEvent.dateToIcs(startDatetime),
      dtEnd: CalendarEvent.dateToIcs(endDatetime),
    };
  }

  /**
   * @param {EventIcsData} data
   * @returns {string[]}
   */
  buildEventLines(data) {
    return [
      CalendarEvent.formatSummary(data.summary),
      CalendarEvent.formatDateTime('DTSTART', data.dtStart),
      CalendarEvent.formatDateTime('DTEND', data.dtEnd),
    ];
  }
}

/** Represents an academic important date (deadline, registration opening, etc.) */
class ImportantDate extends CalendarEvent {
  // MM/DD/YYYY
  static DATE_REGEX = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}$/

  // MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM
  static DATETIME_REGEX = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?$/;

  /**
   * @param {string} name       Name of the important date (e.g., "Add Deadline", "Registration Pass 1 Opens")
   * @param {string} datetime   Raw date string from GOLD page (MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM)
   */
  constructor(name, datetime) {
    super();
    this.name = name;
    this.datetime = datetime;
    this.isTimed = datetime.trim().split(' ').length === 3;
  }

  /**
   * Convert datetime string to Date object.
   * @param {string} datetime - MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM
   * @returns {Date}
   */
  static toDate(datetime) {
    if (!ImportantDate.DATETIME_REGEX.test(datetime)) {
      throw new Error(`Invalid datetime format: ${datetime}`);
    }
    const [date, time, meridiem] = datetime.trim().split(' ');
    const [month, day, year] = date.split('/').map(Number);

    const { hours, minutes } = time && meridiem // contains time
      ? CalendarEvent.to24Hour(`${time} ${meridiem}`)
      : { hours: 0, minutes: 0 };

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  }

  /** @returns {EventIcsData} */
  parseEventIcsData() {
    const startDatetime = ImportantDate.toDate(this.datetime);
    const endDatetime = new Date(startDatetime);

    if (this.isTimed) {
      // Timed event: 1-hour duration
      endDatetime.setUTCHours(endDatetime.getUTCHours() + 1);
    } else {
      // All-day event: end at start of next day
      endDatetime.setUTCDate(endDatetime.getUTCDate() + 1);
    }

    const dtStart = CalendarEvent.dateToIcs(startDatetime);
    const dtEnd = CalendarEvent.dateToIcs(endDatetime);

    return {
      summary: this.name,
      dtStart: this.isTimed ? dtStart : dtStart.slice(0, 8),
      dtEnd: this.isTimed ? dtEnd : dtEnd.slice(0, 8),
    };
  }

  /**
   * @param {EventIcsData} data
   * @returns {string[]}
   */
  buildEventLines(data) {
    return [
      CalendarEvent.formatSummary(data.summary),
      ...(this.isTimed
        ? [
          CalendarEvent.formatDateTime('DTSTART', data.dtStart),
          CalendarEvent.formatDateTime('DTEND', data.dtEnd),
        ]
        : [
          CalendarEvent.formatDate('DTSTART', data.dtStart),
          CalendarEvent.formatDate('DTEND', data.dtEnd),
        ]
      ),
    ];
  }
}