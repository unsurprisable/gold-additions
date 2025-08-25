const SEARCH_URL = 'https://www.ratemyprofessors.com/search/professors/1077?q='

/**
 * @typedef  {Object}   Course
 * @property {string}   name
 * @property {string}   professor
 * @property {string}   days
 * @property {string}   time
 * @property {string}   location
 * @property {string}   courseID
 * @property {string}   grading
 * @property {string}   units
 */

function profNameIsValid(profName) {
  const name = profName.toLowerCase().trim();
  const INVALID_PROF_NAMES = ['cancel', 't.b.a', 't.b.a.'];
  return !INVALID_PROF_NAMES.includes(name);
}

function createRmpLink(profName) {
  const ratemyprofURL = SEARCH_URL + encodeURIComponent(profName);

  const link = document.createElement('a');
  link.href = ratemyprofURL;
  link.rel = 'noopener noreferrer';
  link.textContent = `${profName}`;
  link.target = '_blank';
  link.style = "white-space: nowrap;";

  return link;
}