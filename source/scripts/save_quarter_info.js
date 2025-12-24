/* Copied from xziyu6/export-ucsb-gold (MIT License) */

/* global chrome */

// Function to save quarter's start and end dates to Chrome storage
function saveDates(quarterInfo) {
  const { quarterId, quarterText, startDate, endDate } = quarterInfo;

  chrome.storage.local.get(['quarters'], function (result) {
    let quarters = result.quarters || {};

    // Update or add the quarter information
    quarters[quarterId] = {
      quarterName: quarterText,
      start: startDate,
      end: endDate,
    };

    // save quarter info
    chrome.storage.local.set({ quarters: quarters }, function () {
      if (chrome.runtime.lastError) {
        console.error('Error saving quarter info:', chrome.runtime.lastError);
      } else {
        console.log('Quarter info saved successfully:', quarters);
      }
    });
    // set currentQuarter to quarterId of saved quarter
    chrome.storage.local.set({ currentQuarter: quarterId }, function () {
      if (chrome.runtime.lastError) {
        console.error('Error saving current quarter:', chrome.runtime.lastError);
      } else {
        console.log('Current quarter saved successfully:', quarters);
      }
    });
  });
}

// Format date from MM/DD/YYYY to YYYY-MM-DD using day.js
function formatDate(dateString) {
  const [month, day, year] = dateString.split('/').map(Number);
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Retrieves information about the current quarter, including its ID, text, start date, and end date.
function getQuarterInfo() {
  const startDate = formatDate(
    document.getElementById('pageContent_FirstDayInstructionLabel').textContent.trim());
  const endDate = formatDate(
    document.getElementById('pageContent_LastDayInstructionLabel').textContent.trim());
  const quarter = document.querySelector('#pageContent_quarterDropDown option[selected="selected"]');
  console.log(quarter.getAttribute('value'));
  const quarterId = quarter.getAttribute('value').trim();
  const quarterText = quarter.textContent.trim();
  return {
    quarterId: quarterId,
    quarterText: quarterText,
    startDate: startDate,
    endDate: endDate,
  };
}

function save() {
  saveDates(getQuarterInfo());
}

// Create a submit button and append it to the body
const button = document.createElement('input');
button.type = 'submit';
button.value = 'Save Quarter Info';
document.getElementById('userLabel').insertAdjacentElement('afterend', button);

// Add event listener to trigger saveDates function when the button is clicked
button.addEventListener('click', function (event) {
  console.log('Save Quarter Info button added to the page.');
  event.preventDefault(); // Prevent the default form submission
  save();
});
