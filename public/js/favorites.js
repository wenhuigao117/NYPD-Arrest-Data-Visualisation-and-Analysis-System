
$(document).ready(function() {
  const userId = $('#userId').val();
  
  // Add favorites button to arrest details
  if (userId) {
    const arrestId = $('#arrestId').val();
    if (arrestId) {
      addFavoritesButton(arrestId, userId);
    }
  }
});

function addFavoritesButton(arrestId, userId) {
  const button = $(`
    <button id="favorite-btn" class="favorite-btn" data-arrest-id="${arrestId}" title="Add to favorites">
      <span class="heart-icon">♡</span> Add to Favorites
    </button>
  `);
  
  // Check if already favorited
  $.ajax({
    url: `/users/favorite-status/${arrestId}`,
    method: 'GET',
    success: function(data) {
      if (data.isFavorite) {
        button.addClass('favorited').html('<span class="heart-icon">♥</span> Remove from Favorites');
      }
    }
  });
  
  // Insert button into the action buttons container
  $('.action-buttons-container').prepend(button);
  
  // Handle button click
  $(document).on('click', '#favorite-btn', function(e) {
    e.preventDefault();
    const btn = $(this);
    const arrestId = btn.data('arrest-id');
    const isFavorited = btn.hasClass('favorited');
    
    const action = isFavorited ? 'remove' : 'add';
    
    $.ajax({
      url: `/users/${action}-favorite`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ arrestId: arrestId }),
      success: function() {
        if (isFavorited) {
          btn.removeClass('favorited').html('<span class="heart-icon">♡</span> Add to Favorites');
          showNotification('Removed from favorites', 'info');
        } else {
          btn.addClass('favorited').html('<span class="heart-icon">♥</span> Remove from Favorites');
          showNotification('Added to favorites!', 'success');
        }
      },
      error: function() {
        showNotification('Failed to update favorite status', 'error');
      }
    });
  });
}

function showNotification(message, type) {
  const notification = $(`
    <div class="notification notification-${type}" style="
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.3s ease-in-out;
      ${type === 'success' ? 'background-color: #28a745;' : type === 'error' ? 'background-color: #dc3545;' : 'background-color: #17a2b8;'}
    ">
      ${message}
    </div>
  `);
  
  $('body').append(notification);
  setTimeout(() => {
    notification.fadeOut(300, function() {
      $(this).remove();
    });
  }, 3000);
}