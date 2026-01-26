/* exported SEARCH_URL, Meeting */

const SEARCH_URL = 'https://www.ratemyprofessors.com/search/professors/1077?q=';

/**
 * Abstract base class for calendar events, povides ICS generation utilities and interface for subclasses
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
    const iso = date.toISOString();
    let icsDatetime = iso.split('.')[0];
    icsDatetime = icsDatetime.replaceAll('-', '');
    icsDatetime = icsDatetime.replaceAll(':', '');
    return icsDatetime;
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