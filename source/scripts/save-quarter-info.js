/* Copied from xziyu6/export-ucsb-gold (MIT License) */

/* global chrome, CalendarEvent */

/** 
 * Save quarter information to Chrome storage
 * @param {{[quarterId: string]: {name: string, start: string, end: string}}} quarterInfo 
 */
function saveDates(quarterInfo) {
  chrome.storage.local.get(['quarters'], (result) => {
    const quarters = result.quarters || {};
    Object.assign(quarters, quarterInfo);

    chrome.storage.local.set({ quarters }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving quarter info:', chrome.runtime.lastError);
      }
    });
  });
}

/** 
 * @param {string} dateString MM/DD/YYYY 
 * @returns {string} YYYY-MM-DD 
 */
function formatDate(dateString) {
  const [month, day, year] = dateString.split('/').map(Number);
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}


/** @returns {{[quarterId: string]: {name: string, start: string, end: string}}} */
function getQuarterInfo() {
  const getText = (selector) => document.querySelector(selector).textContent.trim();

  const quarter = document.querySelector('#pageContent_quarterDropDown option[selected="selected"]');
  const quarterId = quarter.getAttribute('value').trim();
  const quarterName = quarter.textContent.trim();
  const startDate = formatDate(getText('#pageContent_FirstDayInstructionLabel'));
  const endDate = formatDate(getText('#pageContent_LastDayInstructionLabel'));

  console.log(`Saved ${quarterId}: ${quarterName}`);
  return { [quarterId]: { name: quarterName, start: startDate, end: endDate } };
}

const buttonHtml = `<input type="submit" value="Save Quarter Info" id="save-quarter-button" style="margin-left: 10px; font-size: 13px; padding: 5px 10px;">`;
document.querySelector('#pageContent_quarterDatesLabel').insertAdjacentHTML('afterend', buttonHtml);

const button = document.getElementById('save-quarter-button');

button.addEventListener('click', function (event) {
  event.preventDefault(); // Prevent the default form submission
  saveDates(getQuarterInfo());
  button.blur(); // Remove focus to prevent darkened state
  
  // Change button text and disable it
  button.value = 'Saved';
  button.disabled = true;
  
  // Reset after 2 seconds
  setTimeout(() => {
    button.value = 'Save Quarter Info';
    button.disabled = false;
  }, 2000);
});
