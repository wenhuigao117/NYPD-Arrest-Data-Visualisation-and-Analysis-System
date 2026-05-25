// filters.js placeholder
// lasted edited on: Dec 04, 2025 - Shravani 
// file name: public/js/filters.js
// small helper for the /arrests/filter page

// Our goal is to kep things simple and modular for now - later we can edit if we feel
// Here we only:
//  - sanity check the precinct range
//  - warn the user if they submit with no filters at all

document.addEventListener('DOMContentLoaded', function() {
    // Look for the filter form that sends a GET request to /arrests/filter
    var filterForm = document.querySelector('form[action="/arrests/filter"]');
    if (!filterForm) {
        return; // No filter form found
    }

    var boroughSelect = document.getElementById('borough');
    var precinctInput = document.getElementById('precinct');
    var ageGroupSelect = document.getElementById('age_group');
    var genderSelect = document.getElementById('gender');
    var raceSelect = document.getElementById('race');

    filterForm.addEventListener('submit', function(event) {
        // 1. Precinct range check (if user typed anything)
        if (precinctInput && precinctInput.value !== "") {
            var rawPrecinct = precinctInput.value.trim();
            var precinctNumber = Number(rawPrecinct);

            if (
                Number.isNaN(precinctNumber) ||
                precinctNumber < 1 ||
                precinctNumber > 123
            ) {
                event.preventDefault();
                alert("Please enter a precinct number between 1 and 123.");
                precinctInput.focus();
                return;
            }
        }

        // 2. If every filter is empty, just warn once
        var hasBorough = boroughSelect && boroughSelect.value && boroughSelect.value !== "";
        var hasPrecinct = precinctInput && precinctInput.value !== "";
        var hasAge = ageGroupSelect && ageGroupSelect.value && ageGroupSelect.value !== "";
        var hasGender = genderSelect && genderSelect.value && genderSelect.value !== "";
        var hasRace = raceSelect && raceSelect.value && raceSelect.value !== "";

        if (!hasBorough && !hasPrecinct && !hasAge && !hasGender && !hasRace) {
            var proceed = window.confirm(
                "No filters selected - this may return a lot of records. Continue?"
            );
            if (!proceed) {
                event.preventDefault();
            }
        }
    });
});