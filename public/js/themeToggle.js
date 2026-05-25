// Theme toggle (Dark / Light mode)
(function () {
    const toggleBtns = document.querySelectorAll("#themeToggle, #theme-toggle");
    if (!toggleBtns.length) return;
  
    // Load saved theme
    const isDark = localStorage.getItem("theme") === "dark";
    if (isDark) {
      document.body.classList.add("dark-mode");
      toggleBtns.forEach(btn => btn.textContent = "☀️ Light Mode");
    }
  
    // Toggle for all buttons
    toggleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const dark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", dark ? "dark" : "light");
        toggleBtns.forEach(b => b.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode");
      });
    });
  })();  
  