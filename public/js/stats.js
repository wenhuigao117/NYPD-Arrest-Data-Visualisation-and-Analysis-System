// public/js/stats.js
// Statistical Dashboard scripts
// - Uses LIVE data for borough chart (from /stats route via window.boroughChartData)
// - Uses LIVE data for monthly chart (via /trends/monthly?format=json)
// - Falls back to sample data if anything fails

$(document).ready(function () {
  const boroughCanvas = document.getElementById('boroughBarChart');
  const monthlyCanvas = document.getElementById('monthlyLineChart');

  // Only run on the stats page (if no canvases, do nothing)
  if (!boroughCanvas && !monthlyCanvas) return;

  
  /*1. BOROUGH BAR CHART (LIVE + FALLBACK)*/

  let boroughLabels = [];
  let boroughCounts = [];
  let boroughTitleSuffix = ' (Sample)'; // default text if we use fallback

  // Try to use live data injected from views/stats.handlebars
  // window.boroughChartData = { labels: [...], counts: [...] }
  if (
    window.boroughChartData &&
    Array.isArray(window.boroughChartData.labels) &&
    Array.isArray(window.boroughChartData.counts) &&
    window.boroughChartData.labels.length === window.boroughChartData.counts.length &&
    window.boroughChartData.labels.length > 0
  ) {
    // LIVE data from DB
    boroughLabels = window.boroughChartData.labels;
    boroughCounts = window.boroughChartData.counts;
    boroughTitleSuffix = ' (Dataset)';
  } else {
    // Fallback: hardcoded sample data (safe if DB / route has an issue)
    boroughLabels = ['BROOKLYN', 'MANHATTAN', 'BRONX', 'QUEENS', 'STATEN ISLAND'];
    boroughCounts = [18540, 14210, 11875, 9250, 2355];
  }

  if (boroughCanvas) {
    new Chart(boroughCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: boroughLabels,
        datasets: [
          {
            label: 'Arrests',
            data: boroughCounts,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            // UPDATED: show whether it is sample or dataset
            text: 'Arrests by Borough' + boroughTitleSuffix
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /* 2. MONTHLY LINE CHART (LIVE VIA /TRENDS) */

  // Helper: draw the monthly chart with given labels + values
  function renderMonthlyChart(labels, values, isLive) {
    if (!monthlyCanvas) return;

    const titleSuffix = isLive ? ' (Dataset)' : ' (Sample)';

    new Chart(monthlyCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Arrests',
            data: values,
            fill: false,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Monthly Arrest Trend' + titleSuffix
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Fallback: if live API fails, use static sample data
  function renderMonthlySample() {
    const sampleLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const sampleCounts = [3200, 2950, 4100, 3800, 3650, 3900];
    renderMonthlyChart(sampleLabels, sampleCounts, false);
  }

  if (monthlyCanvas) {
    // Try to load REAL data from /trends/monthly?format=json
    $.ajax({
      url: '/trends/monthly?format=json',
      method: 'GET',
      dataType: 'json',
      success: function (data) {
        try {
          // Expecting: { trends: [ {month, totalArrests}, ... ] }
          const trends = Array.isArray(data.trends) ? data.trends : [];

          if (!trends.length) {
            // No live data -> fallback
            return renderMonthlySample();
          }

          const labels = trends.map((t) => t.month);
          const values = trends.map((t) => t.totalArrests);

          renderMonthlyChart(labels, values, true);
        } catch (err) {
          console.error('Error parsing monthly trends:', err);
          renderMonthlySample();
        }
      },
      error: function (xhr, status, err) {
        console.error('Failed to load monthly trends:', status, err);
        renderMonthlySample();
      }
    });
  }
});
