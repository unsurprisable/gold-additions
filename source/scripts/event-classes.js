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
   * Convert ISO string to ICS format without separators.
   * @param {string} isoString 2025-01-25T10:25:30
   * @returns {string} 20250125T102530
   */
  static isoToIcs(isoString) {
    return isoString.replaceAll('-', '').replaceAll(':', '');
  }

  /**
   * Convert a Date to ICS datetime (local) without separators.
   * @param {Date} date Date(2025-01-25T10:25:30.000Z)
   * @returns {string} 20250125T102530
   */
  static dateToIcs(date) {
    const iso = date.toISOString().split('.')[0];
    return CalendarEvent.isoToIcs(iso);
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
  * @returns {EventIcsData}
   */
  getEventIcsData() {
    throw new Error('getEventIcsData must be implemented by subclass');
  }

  /**
   * Must be implemented by subclasses
   * @returns {string}
   */
  toIcsEvent() {
    throw new Error('toIcsEvent must be implemented by subclass');
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

// TODO: standardize class structures

/** Represents a recurring course event (lecture/section) */
class CourseClass extends CalendarEvent {
  static QUARTER_START_YEAR = null;
  static QUARTER_START_MONTH = null;
  static QUARTER_START_DAY = null;
  static QUARTER_END_YEAR = null;
  static QUARTER_END_MONTH = null;
  static QUARTER_END_DAY = null;
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

  /** @returns {EventIcsData} */
  getEventIcsData() {
    const [startTime, endTime] = this.time.split('-').map(t => CalendarEvent.to24Hour(t.trim()));
    const days = this.days.split(' ');
    const startDatetime = new Date(Date.UTC(
      CourseClass.QUARTER_START_YEAR,
      CourseClass.QUARTER_START_MONTH - 1,
      CourseClass.QUARTER_START_DAY,
      startTime.hours,
      startTime.minutes,
    ));
    startDatetime.setUTCDate(startDatetime.getUTCDate() + CalendarEvent.DAY_OFFSET[days[0]]);

    const endDatetime = new Date(startDatetime);
    endDatetime.setUTCHours(endTime.hours, endTime.minutes, 0, 0);

    // Compute UNTIL as end of quarter date in UTC (23:59:59Z)
    const untilUtc = new Date(Date.UTC(
      CourseClass.QUARTER_END_YEAR,
      CourseClass.QUARTER_END_MONTH - 1,
      CourseClass.QUARTER_END_DAY,
      23, 59, 59
    ));

    return {
      summary: settings.shortenNames.current ? this.name.split('-')[0].trim() : this.name,
      dtStart: CalendarEvent.dateToIcs(startDatetime),
      dtEnd: CalendarEvent.dateToIcs(endDatetime),
      days: days.map((d) => CalendarEvent.DAY_MAP[d]).join(','),
      untilDate: `${CalendarEvent.dateToIcs(untilUtc)}Z`,
      location: this.location,
      description: settings.includeDescriptions.current ? `Instructor: ${this.professor.split('\n').join(', ')}` : '',
    };
  }

  /** @returns {string} */
  toIcsEvent() {
    const data = this.getEventIcsData();
    const uid = CalendarEvent.generateUid();
    const dtStamp = `${CalendarEvent.dateToIcs(new Date())}Z`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${CalendarEvent.escapeText(data.summary)}`,
      `DTSTART;TZID=America/Los_Angeles:${data.dtStart}`,
      `DTEND;TZID=America/Los_Angeles:${data.dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${data.days};UNTIL=${data.untilDate}`,
      `LOCATION:${CalendarEvent.escapeText(data.location)}`,
    ].concat(
      data.description ? [`DESCRIPTION:${CalendarEvent.escapeText(data.description)}`] : [],
      ['END:VEVENT']
    ).join('\n');
  }
}

/** Represents a final exam (single non-recurring event) */
class FinalExam extends CalendarEvent {
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

  /** @returns {EventIcsData} */
  getEventIcsData() {
    // Parse: "Thursday, March 19, 2026 12:00 PM - 3:00 PM"
    const monthMap = {
      January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
      July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };

    // Extract components: DayOfWeek, Month Day, Year Time - Time
    const match = this.datetime.match(FinalExam.DATETIME_REGEX);
    const [, monthName, day, year, timeRange] = match;
    const [startTimeStr, endTimeStr] = timeRange.split('-').map(t => t.trim());

    const startTime = CalendarEvent.to24Hour(startTimeStr);
    const endTime = CalendarEvent.to24Hour(endTimeStr);

    const startDatetime = new Date(Date.UTC(
      Number(year),
      monthMap[monthName],
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

  /** @returns {string} */
  toIcsEvent() {
    const data = this.getEventIcsData();
    const uid = CalendarEvent.generateUid();
    const dtStamp = `${CalendarEvent.dateToIcs(new Date())}Z`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${CalendarEvent.escapeText(data.summary)}`,
      `DTSTART;TZID=America/Los_Angeles:${data.dtStart}`,
      `DTEND;TZID=America/Los_Angeles:${data.dtEnd}`,
    ].concat(
      data.location ? [`LOCATION:${CalendarEvent.escapeText(data.location)}`] : [],
      data.description ? [`DESCRIPTION:${CalendarEvent.escapeText(data.description)}`] : [],
      ['END:VEVENT']
    ).join('\n');
  }
}

// TODO: move important date naming to save file
/** Represents an academic important date (deadline, registration opening, etc.) */
class ImportantDate extends CalendarEvent {
  /**
   * @param {string} name       Name of the important date (e.g., "Add Deadline", "Registration Pass 1 Opens")
   * @param {string} datetime   Raw date string from GOLD page (MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM)
   */
  constructor(name, datetime) {
    super();
    this.name = name;
    this.datetime = datetime;
  }

  /**
   * @param {string} dateString MM/DD/YYYY or MM/DD/YYYY HH:MM AM/PM
   * @returns {string} YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS (ISO 8601)
   */
  static formatDate(datetime) {
    const parts = datetime.trim().split(' ');
    const [month, day, year] = parts[0].split('/').map(Number);
    const dateFormatted = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    if (parts.length === 3) {
      // Has time component
      const timeString = `${parts[1]} ${parts[2]}`; // HH:MM AM/PM
      const { hours, minutes } = CalendarEvent.to24Hour(timeString);
      return `${dateFormatted}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }

    return dateFormatted;
  }

  /** @returns {EventIcsData} */
  getEventIcsData() {
    const summary = this.name;
    const isoString = ImportantDate.formatDate(this.datetime);
    const startDatetime = new Date(isoString);
    const isDateTime = this.datetime.trim().split(' ').length === 3;

    const endDatetime = new Date(startDatetime);
    if (!isDateTime) {
      // All-day events: end at start of next day
      endDatetime.setUTCDate(endDatetime.getUTCDate() + 1);
    } else {
      // Timed events: 1-hour duration
      endDatetime.setUTCHours(endDatetime.getUTCHours() + 1);
    }

    return {
      summary,
      dtStart: CalendarEvent.dateToIcs(startDatetime),
      dtEnd: CalendarEvent.dateToIcs(endDatetime),
    };
  }

  /** @returns {string} */
  toIcsEvent() {
    const data = this.getEventIcsData();
    const uid = CalendarEvent.generateUid();
    const dtStamp = `${CalendarEvent.dateToIcs(new Date())}Z`;
    const isDateTime = this.datetime.trim().split(' ').length === 3;

    const base = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${CalendarEvent.escapeText(data.summary)}`,
    ];

    const dateLines = isDateTime
      ? [
        `DTSTART;TZID=America/Los_Angeles:${data.dtStart}`,
        `DTEND;TZID=America/Los_Angeles:${data.dtEnd}`,
      ]
      : [
        `DTSTART;VALUE=DATE:${data.dtStart.slice(0, 8)}`,
        `DTEND;VALUE=DATE:${data.dtEnd.slice(0, 8)}`,
      ];

    return base.concat(dateLines, ['END:VEVENT']).join('\n');
  }
}