/* exported SEARCH_URL, QUARTER_DATE_FIELDS */

const SEARCH_URL = 'https://www.ratemyprofessors.com/search/professors/1077?q=';

const QUARTER_DATE_FIELDS = {
  start: { name: 'First Day of Instruction', selector: '#pageContent_FirstDayInstructionLabel' },
  end: { name: 'Last Day of Instruction', selector: '#pageContent_LastDayInstructionLabel' },
  pass1Start: { name: 'Registration Pass 1 Opens', selector: '#pageContent_PassOneLabel', extractStart: true },
  pass1End: { name: 'Registration Pass 1 Closes', selector: '#pageContent_PassOneLabel', extractEnd: true, allDay: true },
  pass2Start: { name: 'Registration Pass 2 Opens', selector: '#pageContent_PassTwoLabel', extractStart: true },
  pass2End: { name: 'Registration Pass 2 Closes', selector: '#pageContent_PassTwoLabel', extractEnd: true, allDay: true },
  pass3Start: { name: 'Registration Pass 3 Opens', selector: '#pageContent_PassThreeLabel', extractStart: true },
  pass3End: { name: 'Registration Pass 3 Closes', selector: '#pageContent_PassThreeLabel', extractEnd: true, allDay: true },
  addDeadline: { name: 'Add Course Deadline', selector: '#pageContent_AddDeadlineLabel' },
  dropDeadline: { name: 'Drop Course Deadline', selector: '#pageContent_DropDeadlineLabel' },
  pNpDeadline: { name: 'P/NP Deadline', selector: '#pageContent_GradingOptionLabel' },
  feeDeadline: { name: 'Fee Deadline', selector: '#pageContent_FeeDeadlineLabel' }
};