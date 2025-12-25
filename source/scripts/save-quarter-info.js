/* Copied from xziyu6/export-ucsb-gold (MIT License) */

/* global chrome */

/** 
 * Function to save quarter's start and end dates to Chrome storage
 * @param {{quarterId: string, quarterName: string, startDate: string, endDate: string}} quarterInfo 
 */
function saveDates(quarterInfo) {
  const { quarterId, quarterName, startDate, endDate } = quarterInfo;

  chrome.storage.local.get(['quarters'], (result) => {
    let quarters = result.quarters || {};

    // Update or add the quarter information
    quarters[quarterId] = {
      name: quarterName,
      start: startDate,
      end: endDate,
    };

    // save quarter info
    chrome.storage.local.set({ quarters: quarters }, () => {
      if (chrome.runtime.lastError)
        console.error('Error saving quarter info:', chrome.runtime.lastError);
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


/** @returns {{quarterId: string, quarterName: string, startDate: string, endDate: string}} */
function getQuarterInfo() {
  const startDate = formatDate(
    document.querySelector('#pageContent_FirstDayInstructionLabel').textContent.trim());
  const endDate = formatDate(
    document.querySelector('#pageContent_LastDayInstructionLabel').textContent.trim());
  const quarter = document.querySelector('#pageContent_quarterDropDown option[selected="selected"]');
  const quarterId = quarter.getAttribute('value').trim();
  const quarterName = quarter.textContent.trim();
  console.log(`Saved ${quarterId}: ${quarterName}`);
  return {
    quarterId: quarterId,
    quarterName: quarterName,
    startDate: startDate,
    endDate: endDate,
  };
}

// Create a submit button and append it to the body
const button = document.createElement('input');
button.type = 'submit';
button.value = 'Save Quarter Info';
button.style.marginLeft = '10px';
button.style.fontSize = '13px';
button.style.padding = '5px 10px';
document.querySelector('#pageContent_FirstDayInstructionLabel').insertAdjacentElement('afterend', button);

button.addEventListener('click', function (event) {
  event.preventDefault(); // Prevent the default form submission
  saveDates(getQuarterInfo());
  button.blur(); // Remove focus to prevent darkened state
});
