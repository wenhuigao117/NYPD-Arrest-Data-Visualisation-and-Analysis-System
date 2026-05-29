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
// Mobile dropdown toggle
document.addEventListener('DOMContentLoaded', function() {
  const toggles = document.querySelectorAll('.dropdown-toggle');
  
  toggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const parent = this.closest('.nav-dropdown');
      const isOpen = parent.classList.contains('open');
      
      // 关闭所有其他下拉
      document.querySelectorAll('.nav-dropdown').forEach(function(d) {
        d.classList.remove('open');
      });
      
      // 切换当前
      if (!isOpen) {
        parent.classList.add('open');
      }
    });
  });

  // 点击页面其他地方关闭所有下拉
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-dropdown') && !e.target.closest('#hamburger') && !e.target.closest('#nav-links')) {
      document.querySelectorAll('.nav-dropdown').forEach(function(d) {
        d.classList.remove('open');
      });
    }
  });
});

// 滚动时关闭所有下拉菜单
window.addEventListener('scroll', function() {
  document.querySelectorAll('.nav-dropdown').forEach(function(d) {
    d.classList.remove('open');
  });
});

// 汉堡菜单
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('open');
    });
  }
});
