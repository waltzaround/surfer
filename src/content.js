/**
 * Surfer - Content Script
 * 
 * This script is injected into web pages and handles adding the video overlay
 */

// Prevent multiple injections of the script
if (typeof surferExtensionLoaded === 'undefined') {
  // Mark as loaded
  window.surferExtensionLoaded = true;
  
  // Global variables
  let videoElement = null;
  let isHovering = false;
  let hoverTimeout = null;
  let currentSide = 'right'; // Track which side the video is currently on

  // Listen for messages from the popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleVideo') {
      // Check if we need to force a specific state
      if (message.forceState === true) {
        // Force video to be added
        if (!videoElement) {
          addVideo(message.videoUrl);
          sendResponse({ success: true, status: 'added' });
        } else {
          // Video already exists
          sendResponse({ success: true, status: 'added' });
        }
      } else if (message.forceState === false) {
        // Force video to be removed
        if (videoElement) {
          removeVideo();
          sendResponse({ success: true, status: 'removed' });
        } else {
          // Video already removed
          sendResponse({ success: true, status: 'removed' });
        }
      } else {
        // Toggle behavior (default)
        if (videoElement) {
          // If video exists, remove it
          removeVideo();
          sendResponse({ success: true, status: 'removed' });
        } else {
          // If no video exists, add it
          addVideo(message.videoUrl);
          sendResponse({ success: true, status: 'added' });
        }
      }
      return true; // Indicates async response
    }
  });

  // Function to add the video element to the page
  function addVideo(videoUrl) {
    // Don't add if it already exists
    if (videoElement) return;
    
    // Create video container
    videoElement = document.createElement('div');
    videoElement.id = 'surfer-video-container';
    
    // Original dimensions
    const originalWidth = 250;
    const originalHeight = 560;
    
    // Increase dimensions by 20%
    const newWidth = originalWidth * 1.2;
    const newHeight = originalHeight * 1.2;
    
    // Set initial side (right by default)
    currentSide = 'right';
    
    // Set styles for container - phone portrait aspect ratio with 20% size increase
    Object.assign(videoElement.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      left: 'auto', // Make sure left is not set
      width: `${newWidth}px`,
      height: `${newHeight}px`,
      zIndex: '9999',
      border: '1px solid #333',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.5s ease',
      pointerEvents: 'none' // Disable all mouse events on the container
    });

    // Extract YouTube video ID from URL
    const videoId = extractYouTubeId(videoUrl);
    
    // Check if this is the second video (NX-i0IWl3yg)
    const isSecondVideo = videoId === 'NX-i0IWl3yg';
    
    // Create a wrapper for the iframe to help with positioning the overlay
    const iframeWrapper = document.createElement('div');
    Object.assign(iframeWrapper.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none' // Disable all mouse events on the wrapper
    });
    
    // Create an iframe for YouTube embedding
    const iframe = document.createElement('iframe');
    
    // Set different parameters for the second video to fill the container
    if (isSecondVideo) {
      // For the second video, we'll use a different approach to fill the container
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&disablekb=1&fs=0&rel=0`;
      
      // Set styles for iframe to scale up and overflow to remove black bars
      Object.assign(iframe.style, {
        width: '385%', // Scale up to remove horizontal black bars
        height: '385%', // Scale up to remove vertical black bars
        border: 'none',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)', // Center the scaled iframe
        objectFit: 'cover',
        pointerEvents: 'none' // Disable all mouse events on the iframe
      });
    } else {
      // For the first video, use the original approach
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&showinfo=0&disablekb=1&fs=0&rel=0`;
      
      // Set styles for iframe
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none',
        position: 'absolute',
        top: '0',
        left: '0',
        pointerEvents: 'none' // Disable all mouse events on the iframe
      });
    }
    
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = false; // Disable fullscreen
    
    // Add elements to the DOM
    iframeWrapper.appendChild(iframe);
    videoElement.appendChild(iframeWrapper);
    
    // Create an invisible overlay div to capture mouse events for hover
    const eventOverlay = document.createElement('div');
    Object.assign(eventOverlay.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: `${newWidth}px`,
      height: `${newHeight}px`,
      zIndex: '10000',
      background: 'transparent',
      pointerEvents: 'auto' // This div will receive mouse events
    });
    
    // Add the video and event overlay to the page
    document.body.appendChild(videoElement);
    document.body.appendChild(eventOverlay);
    
    // Store reference to the event overlay
    videoElement.eventOverlay = eventOverlay;

    // Add event listeners for hover behavior to the event overlay
    eventOverlay.addEventListener('mouseenter', handleMouseEnter);
    eventOverlay.addEventListener('mouseleave', handleMouseLeave);
    
    // Add a global click listener to detect clicks outside the video
    document.addEventListener('click', handleDocumentClick);
  }

  // Function to extract YouTube video ID from URL
  function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }

  // Function to remove the video element
  function removeVideo() {
    if (videoElement) {
      // Remove event overlay and its event listeners
      if (videoElement.eventOverlay) {
        videoElement.eventOverlay.removeEventListener('mouseenter', handleMouseEnter);
        videoElement.eventOverlay.removeEventListener('mouseleave', handleMouseLeave);
        
        if (videoElement.eventOverlay.parentNode) {
          videoElement.eventOverlay.parentNode.removeChild(videoElement.eventOverlay);
        }
      }
      
      // Remove global event listener
      document.removeEventListener('click', handleDocumentClick);
      
      // Clear any pending timeouts
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      
      // Remove video element from DOM
      if (videoElement.parentNode) {
        videoElement.parentNode.removeChild(videoElement);
      }
      
      videoElement = null;
      isHovering = false;
    }
  }

  // Handle mouse enter event
  function handleMouseEnter() {
    isHovering = true;
    
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    // Move the video to the opposite side
    moveToOppositeSide();
  }

  // Handle mouse leave event
  function handleMouseLeave() {
    isHovering = false;
    
    // Set a timeout to move the video back if the mouse doesn't re-enter
    hoverTimeout = setTimeout(() => {
      if (!isHovering && videoElement) {
        // Return to original side after a delay
        moveToOriginalSide();
      }
    }, 1000); // 1 second delay before moving back
  }
  
  // Move video to the opposite side of the screen
  function moveToOppositeSide() {
    if (!videoElement) return;
    
    const windowWidth = window.innerWidth;
    
    if (currentSide === 'right') {
      // Move from right to left
      videoElement.style.left = '20px';
      videoElement.style.right = 'auto';
      
      // Also move the event overlay
      if (videoElement.eventOverlay) {
        videoElement.eventOverlay.style.left = '20px';
        videoElement.eventOverlay.style.right = 'auto';
      }
      
      currentSide = 'left';
    } else {
      // Move from left to right
      videoElement.style.right = '20px';
      videoElement.style.left = 'auto';
      
      // Also move the event overlay
      if (videoElement.eventOverlay) {
        videoElement.eventOverlay.style.right = '20px';
        videoElement.eventOverlay.style.left = 'auto';
      }
      
      currentSide = 'right';
    }
  }
  
  // Move video back to its original side
  function moveToOriginalSide() {
    // No need to implement this as we want the video to stay on the side it moved to
  }
  
  // Handle document click event
  function handleDocumentClick(e) {
    // If we have a video and the click was outside the video and its event overlay
    if (videoElement && videoElement.eventOverlay && !videoElement.eventOverlay.contains(e.target)) {
      // Move to opposite side when clicking elsewhere on the page
      moveToOppositeSide();
    }
  }
}
