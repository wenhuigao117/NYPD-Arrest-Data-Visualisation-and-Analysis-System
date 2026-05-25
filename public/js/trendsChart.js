// Chart.js visualization for trends page
(function () {
    const ctx = document.getElementById("trendChart");
    if (!ctx || !window.trendData || !window.trendData.length) return;
  
    const type = window.trendType;
    const labels = [];
    const dataPoints = [];
  
    if (type === "month") {
      window.trendData.forEach(item => {
        labels.push(item.month);
        dataPoints.push(item.totalArrests);
      });
    } else {
      window.trendData.forEach(item => {
        labels.push(`${item.year}-W${item.week}`);
        dataPoints.push(item.totalArrests);
      });
    }
  
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: type === "month" ? "Monthly Arrests" : "Weekly Arrests",
          data: dataPoints,
          fill: true,
          borderColor: "#3498db",
          backgroundColor: "rgba(52,152,219,0.2)",
          pointBackgroundColor: "#2980b9",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#2c3e50" }
          },
          tooltip: {
            mode: "index",
            intersect: false
          }
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false
        },
        scales: {
          x: {
            ticks: { color: "#2c3e50" },
            title: {
              display: true,
              text: type === "month" ? "Month" : "Week",
              color: "#2c3e50"
            }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#2c3e50" },
            title: {
              display: true,
              text: "Total Arrests",
              color: "#2c3e50"
            },
            grid: {
              color: "rgba(0,0,0,0.1)"
            }
          }
        }
      }
    });
  })();
  