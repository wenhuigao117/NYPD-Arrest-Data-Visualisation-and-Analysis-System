
$(document).ready(function() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
    showError('Chart.js library failed to load. Please refresh the page.');
    return;
  }

  // Fetch demographic data from the backend
  $.ajax({
    url: '/stats/demographics',
    method: 'GET',
    dataType: 'json',
    success: function(data) {
      console.log('Demographic data received:', data);
      
      // Initialize all charts with the fetched data
      initializeAgeGroupChart(data.ageGroupData);
      initializeGenderChart(data.genderData);
      initializeRaceChart(data.raceData);
      initializeBoroughDemographicChart(data.boroughDemographicData);
      initializeAgeGenderChart(data.ageGenderData);
      initializeRaceBoroughChart(data.raceBoroughData);
      
      // Update statistics
      updateStatistics(data);
    },
    error: function(err) {
      console.error('Error loading demographic data:', err);
      showError('Failed to load demographic data');
    }
  });

  function initializeAgeGroupChart(data) {
    const ctx = document.getElementById('ageGroupChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Number of Arrests',
          data: data.values,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribution by Age Group'
          }
        }
      }
    });
  }

  function initializeGenderChart(data) {
    const ctx = document.getElementById('genderChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Number of Arrests',
          data: data.values,
          backgroundColor: [
            '#3498db',
            '#e74c3c',
            '#95a5a6'
          ],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Gender Distribution'
          }
        }
      }
    });
  }

  function initializeRaceChart(data) {
    const ctx = document.getElementById('raceChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Number of Arrests',
          data: data.values,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ],
          borderColor: '#333',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Arrests by Race/Ethnicity'
          }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function initializeBoroughDemographicChart(data) {
    const ctx = document.getElementById('boroughDemographicChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Age 18-25',
          data: data.age18_25,
          backgroundColor: '#FF6384'
        },
        {
          label: 'Age 25-45',
          data: data.age25_45,
          backgroundColor: '#36A2EB'
        },
        {
          label: 'Age 45+',
          data: data.age45plus,
          backgroundColor: '#FFCE56'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            stacked: false
          },
          y: {
            stacked: false,
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Age Groups by Borough'
          }
        }
      }
    });
  }

  function initializeAgeGenderChart(data) {
    const ctx = document.getElementById('ageGenderChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Male',
          data: data.male,
          backgroundColor: '#3498db'
        },
        {
          label: 'Female',
          data: data.female,
          backgroundColor: '#e74c3c'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            stacked: false
          },
          y: {
            stacked: false,
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Age Group Distribution by Gender'
          }
        }
      }
    });
  }

  function initializeRaceBoroughChart(data) {
    const ctx = document.getElementById('raceBoroughChart').getContext('2d');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Black',
          data: data.black,
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.1)'
        },
        {
          label: 'White',
          data: data.white,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)'
        },
        {
          label: 'Hispanic',
          data: data.hispanic,
          borderColor: '#FFCE56',
          backgroundColor: 'rgba(255, 206, 86, 0.1)'
        },
        {
          label: 'Asian',
          data: data.asian,
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Racial Composition by Borough'
          }
        },
        scales: {
          r: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function updateStatistics(data) {
    // Total arrests
    const totalArrests = data.total || 0;
    $('#totalArrestsCount').text(totalArrests.toLocaleString());

    // Most common age group (excluding null/unknown)
    if (data.ageGroupData && data.ageGroupData.labels.length > 0) {
      let maxVal = 0;
      let maxLabel = 'N/A';
      for (let i = 0; i < data.ageGroupData.labels.length; i++) {
        const label = data.ageGroupData.labels[i].toLowerCase();
        if (!label.includes('null') && !label.includes('unknown') && data.ageGroupData.values[i] > maxVal) {
          maxVal = data.ageGroupData.values[i];
          maxLabel = data.ageGroupData.labels[i];
        }
      }
      $('#mostCommonAge').text(maxLabel);
    }

    // Gender ratio (find M and F specifically)
    if (data.genderData && data.genderData.labels.length > 0) {
      let maleCount = 0;
      let femaleCount = 0;
      for (let i = 0; i < data.genderData.labels.length; i++) {
        const label = data.genderData.labels[i].toUpperCase();
        if (label === 'M' || label === 'MALE') {
          maleCount = data.genderData.values[i];
        } else if (label === 'F' || label === 'FEMALE') {
          femaleCount = data.genderData.values[i];
        }
      }
      const ratio = femaleCount > 0 ? (maleCount / femaleCount).toFixed(2) : 'N/A';
      $('#genderRatio').text(ratio !== 'N/A' ? `${ratio}:1 (M:F)` : 'N/A');
    }

    // Most represented race (excluding unknown)
    if (data.raceData && data.raceData.labels.length > 0) {
      let maxVal = 0;
      let maxLabel = 'N/A';
      for (let i = 0; i < data.raceData.labels.length; i++) {
        const label = data.raceData.labels[i].toLowerCase();
        if (!label.includes('unknown') && data.raceData.values[i] > maxVal) {
          maxVal = data.raceData.values[i];
          maxLabel = data.raceData.labels[i];
        }
      }
      $('#mostRepresentedRace').text(maxLabel);
    }
  }

  function showError(message) {
    const errorDiv = $(`<div class="error-message">${message}</div>`);
    $('.demographic-insights-container').prepend(errorDiv);
    setTimeout(() => {
      errorDiv.fadeOut(() => errorDiv.remove());
    }, 5000);
  }
});
