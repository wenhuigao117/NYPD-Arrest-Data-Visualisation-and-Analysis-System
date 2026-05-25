// main.js placeholder
// public/js/main.js
$(document).ready(function() {
  console.log('NYC Arrests App - Client scripts loaded');
  
  // Prevent double form submission
  $('form').on('submit', function() {
    const $btn = $(this).find('button[type="submit"]');
    $btn.prop('disabled', true);
    setTimeout(() => $btn.prop('disabled', false), 2000);
  });
  
  // Smooth scroll
  $('a[href^="#"]').on('click', function(e) {
    const target = $(this.getAttribute('href'));
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 80 }, 600);
    }
  });
});