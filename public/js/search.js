// search.js placeholder
// file name: public/js/search.js

// Client side helper for the arrests search page

// Main ideas:
// - trim the keyword before sumit
// - avoid submitting empty or 1 - 2 character searches
// - show a small, inline error message when possible

document.addEventListener('DOMContentLoaded', function() {
    var searchForm = document.getElementById('search-form');
    if (!searchForm) {
        return; // No search form found
    }

    var keywordInput = document.getElementById('keyword');
    var errorBox = document.getElementById('search-error');

    function showError(message) {
        if (errorBox) {
            errorBox.textContent = message;
        } else {
            alert(message);
        }
    }

    searchForm.addEventListener('submit', function(event) { 
        if (!keywordInput) {
            return; // No keyword input found
        }

        var value = keywordInput.value.trim();
        keywordInput.value = value; // Update the input with trimmed value

        if (!value) {
            event.preventDefault();
            showError("Please enter a keyword before searching.");
            keywordInput.focus();
            return;
        }

        // optional: basic length check so we dont spam the server
        if (value.length < 3) {
            var proceed = window.confirm(
                "The keyword is very short. Continue anyway?"
            );

            if (!proceed) {
                event.preventDefault();
                keywordInput.focus();
            } else if (errorBox) {
                // clear any prior client side error if user chooses to proceed
                errorBox.textContent = "";
            }
        } else if (errorBox) {
            // clear leftover messages on valid submit
            errorBox.textContent = "";
        }
    });
});