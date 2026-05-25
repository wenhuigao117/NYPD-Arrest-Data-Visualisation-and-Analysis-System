// referenceData.js - static dropdown data placeholder
/* 
Last edited by Shravani on November 21, 2025 - 11:13 pm
*/

/* 
About this file:
  - This file is only for things that are basically "fixed lists" like:
      borough names, race buckets, age groups, etc. 
  - It doesnt touch db (mongo). 
  - Routes and the seed script can import this instead of hardcoding strings in multiple places.
*/


/* Boroughs */
/* 
- In the raw NYPD data and in our DB proposal we have 5 boroughs
- The dataset often uses codes (B, K, M, Q, S), but for the UI we also want the full names.
- createArrest currently validate using the single letter codes, so both are kept here.
*/

const boroughs = [
  "MANHATTAN",
  "BROOKLYN",
  "BRONX",
  "QUEENS",
  "STATEN ISLAND"
];

// simple code map that lines up with the NYPD style
// key = full borough name, value = single-letter code
const boroughCodeMap = {
  MANHATTAN: "M",
  BROOKLYN: "K",
  BRONX: "B",
  QUEENS: "Q",
  "STATEN ISLAND": "S"
};




/* Races Bucket */
/*
- In arrests.js we validate against the full list from the dataset:
  "WHITE", "WHITE HISPANIC", "BLACK", "BLACK HISPANIC", "ASIAN / PACIFIC ISLANDER", "AMERICAN INDIAN / ALASKAN NATIVE", "UNKNOWN"
- For charts / filters we dont want seven separate categories, so we collapse them into a few buckets. 
*/
const races = ["WHITE", "BLACK", "ASIAN", "HISPANIC", "OTHER"];

const rawRaceValues = [
  "WHITE",
  "WHITE HISPANIC",
  "BLACK",
  "BLACK HISPANIC",
  "ASIAN / PACIFIC ISLANDER",
  "AMERICAN INDIAN / ALASKAN NATIVE",
  "UNKNOWN"
];


/* Sex or Gender */
/*
- The dataset (and prior code of like arrests.js) support "M", "F", "U"
- For filters we mainly care about M/F, but U is kept separately incase we want to expose it later
*/

const sexes = ["M", "F"];

const allSexValues = ["M", "F", "U"];


/* Age Groups */
/*
- This bucket is taken from the proposal and from arrests.js reference file
- (There we also allow "null" for missing values; like we saw some while reviewing db)
- Here we only keep the visible buckets for UI
*/

const ageGroups = ["<18", "18-24", "25-44", "45-64", "65+"];


/* Get helpers */
/* 
- returns arrays are copied so nobody can accidently change the original in another file
*/

function getBoroughs() {
  return boroughs.slice();
}

function getRaces() {
  return races.slice();
}

function getSexes() {
  return sexes.slice();
}

function getAgeGroups() {
  return ageGroups.slice();
}


/* Validation helpers */
/* 
- these are meant for query params and forms
- they are simple checks so routes dont have to repeat the same logic everywhere
*/

function isValidBoroughName(name) {
  if (!name || typeof name !== "string") return false;
  return boroughs.includes(name.toUpperCase());
}

function isValidBoroughCode(code) {
  if (!code || typeof code !== "string") return false;
  const upper = code.toUpperCase();
  return Object.values(boroughCodeMap).includes(upper);
}

function isValidRaceBucket(value) {
  if (!value || typeof value !== "string") return false;
  return races.includes(value.toUpperCase());
}

function isValidRawRace(value) {
  if (!value || typeof value !== "string") return false;
  return rawRaceValues.includes(value.toUpperCase());
}

function isValidSex(value) {
  if (!value || typeof value !== "string") return false;
  return allSexValues.includes(value.toUpperCase());
}

function isValidAgeGroup(value) {
  if (!value || typeof value !== "string") return false;
  return ageGroups.includes(value);
}


/* Mapping helpers */
/*
- these are handy for the seed scripts or any ETL steps:
    - converting full race strings into our five buckets
    - converting full borough name into a one letter code
*/

function mapRawRaceToBucket(raw) {
  if (!raw || typeof raw !== "string") return "OTHER";

  const value = raw.toUpperCase().trim();

  if (value.includes("HISPANIC")) return "HISPANIC";
  if (value.includes("BLACK")) return "BLACK";
  if (value.includes("ASIAN")) return "ASIAN";
  if (value.includes("WHITE")) return "WHITE";

  return "OTHER";
}

function getBoroughCodeFromName(name) {
  if (!name || typeof name !== "string") return null;
  const key = name.toUpperCase();
  return boroughCodeMap[key] || null;
}


/* Default export */
/*
- data/index.js imports this as "referenceData", so everything is grouped here
- other files can either use the raw arrays (referenceData.boroughs) or the helpers (referenceData.getBoroughs())
*/

const referenceData = {
  boroughs,
  races,
  sexes,
  ageGroups,

  getBoroughs,
  getRaces,
  getSexes,
  getAgeGroups,

  isValidBoroughName,
  isValidBoroughCode,
  isValidRaceBucket,
  isValidRawRace,
  isValidSex,
  isValidAgeGroup,

  mapRawRaceToBucket,
  getBoroughCodeFromName,

  rawRaceValues,
  allSexValues
};


export default referenceData;
