/* Copied from xziyu6/export-ucsb-gold (MIT License) */
/* global QUARTER_DATE_FIELDS */

/** @returns {{[quarterId: string]: {name: string, start: string, end: string}}} */
function getQuarterInfo() {
  const getText = (selector) => document.querySelector(selector).textContent.trim();

  const quarter = document.querySelector('#pageContent_quarterDropDown option[selected="selected"]');
  const quarterId = quarter.getAttribute('value').trim();
  const quarterName = quarter.textContent.trim();

  const quarterData = { name: quarterName };
  
  Object.entries(QUARTER_DATE_FIELDS).forEach(([key, config]) => {
    let value = getText(config.selector);
    if (config.extractStart || config.extractEnd)
      value = value.split(' - ')[config.extractStart ? 0 : 1];
    if (config.allDay) value = value.split(' ')[0];
    quarterData[key] = value;
  });

  return { [quarterId]: quarterData };
}

/** 
 * Save quarter information and date field names to Chrome storage
 * @param {Object} quarterInfo - Quarter data keyed by quarter ID
 */
function saveDates(quarterInfo) {
  chrome.storage.local.get(['quarters'], (result) => {
    const quarters = result.quarters || {};
    Object.assign(quarters, quarterInfo);
    chrome.storage.local.set({ quarters });
  });
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
