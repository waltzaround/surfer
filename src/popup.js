/**
 * Surfer - Popup Script
 * 
 * This file handles the popup UI interactions for the Surfer extension.
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleVideoButton = document.getElementById('toggle-video');
  const statusElement = document.getElementById('status');
  const videoOptions = document.querySelectorAll('.video-option');
  const videoRadios = document.querySelectorAll('input[name="video-selection"]');
  
  // Check current state when popup opens
  checkCurrentState();

  // Handle video option selection
  videoOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Find the radio input inside this option
      const radio = option.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        
        // Update visual selection
        videoOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Store the selected video URL in storage
        chrome.storage.local.set({ videoUrl: radio.value });
      }
    });
  });
  
  // Also handle direct radio button clicks
  videoRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        // Update visual selection
        videoOptions.forEach(opt => opt.classList.remove('selected'));
        radio.closest('.video-option').classList.add('selected');
        
        // Store the selected video URL in storage
        chrome.storage.local.set({ videoUrl: radio.value });
      }
    });
  });

  // Toggle video button click handler
  toggleVideoButton.addEventListener('click', () => {
    // Get the currently selected video URL
    const selectedRadio = document.querySelector('input[name="video-selection"]:checked');
    const videoUrl = selectedRadio ? selectedRadio.value : 'https://www.youtube.com/watch?v=zZ7AimPACzc';
    
    // Store the selected URL
    chrome.storage.local.set({ videoUrl: videoUrl });
    
    // Send message to background script to toggle video
    chrome.runtime.sendMessage({ 
      action: 'popupAction',
      videoUrl: videoUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        showStatus('Error toggling video', 'error');
        return;
      }
      
      if (response && response.success) {
        const isActive = response.status === 'added';
        updateToggleButtonText(isActive);
        
        if (isActive) {
          showStatus('Video overlay added!', 'success');
        } else {
          showStatus('Video overlay removed!', 'success');
        }
      } else if (response && response.error) {
        showStatus(response.error, 'error');
      }
    });
  });

  // Function to check current state
  function checkCurrentState() {
    // Load saved video URL from storage
    chrome.storage.local.get(['videoUrl'], (data) => {
      if (data.videoUrl) {
        // Find and select the matching radio button
        const radio = document.querySelector(`input[value="${data.videoUrl}"]`);
        if (radio) {
          radio.checked = true;
          
          // Update visual selection
          videoOptions.forEach(opt => opt.classList.remove('selected'));
          radio.closest('.video-option').classList.add('selected');
        }
      }
    });
    
    // Check if video is currently active
    chrome.runtime.sendMessage({ action: 'checkVideoState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking video state:', chrome.runtime.lastError);
        return;
      }
      
      // Update button text based on current state
      updateToggleButtonText(response.active);
    });
  }

  // Helper function to show status messages
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = 'status';
    
    if (type) {
      statusElement.classList.add(type);
    }
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status';
    }, 3000);
  }

  // Helper function to update toggle button text
  function updateToggleButtonText(isActive) {
    toggleVideoButton.textContent = isActive ? 'Remove Video Overlay' : 'Add Video Overlay';
  }
});
