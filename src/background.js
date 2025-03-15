/**
 * Surfer - Background Service Worker
 * 
 * This file handles background tasks for the Surfer extension.
 */

// Default YouTube video URL
const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=zZ7AimPACzc';

// Global state tracking
let activeTabsWithVideo = new Set();

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Surfer extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.set({
    videoUrl: DEFAULT_VIDEO_URL,
    isActive: false
  });
});

// Listen for tab updates (including navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.status === 'complete') {
    // Check if this tab should have the video
    if (activeTabsWithVideo.has(tabId)) {
      // Get the stored video URL
      chrome.storage.local.get(['videoUrl'], (data) => {
        const videoUrl = data.videoUrl || DEFAULT_VIDEO_URL;
        // Re-inject the content script and add the video
        injectContentScriptAndToggleVideo(tabId, true, videoUrl);
      });
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove from our tracking set if the tab is closed
  if (activeTabsWithVideo.has(tabId)) {
    activeTabsWithVideo.delete(tabId);
    
    // Update the active state in storage if this was the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id === tabId) {
        chrome.storage.local.set({ isActive: false });
      }
    });
  }
});

// Function to inject content script and toggle video
function injectContentScriptAndToggleVideo(tabId, forceState = null, videoUrl = DEFAULT_VIDEO_URL) {
  // First, try to inject the content script if it's not already there
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['src/content.js']
  }, () => {
    // Ignore any errors from executeScript as the content script might already be there
    
    // Now send message to content script
    chrome.tabs.sendMessage(tabId, {
      action: 'toggleVideo',
      videoUrl: videoUrl,
      forceState: forceState // Can be true, false, or null (toggle)
    }, (response) => {
      // Handle case where there's no response (content script might not be loaded)
      if (chrome.runtime.lastError) {
        console.error('Error sending message to content script:', chrome.runtime.lastError);
        return;
      }
      
      // Update our tracking based on response
      if (response && response.success) {
        if (response.status === 'added') {
          activeTabsWithVideo.add(tabId);
          
          // Update storage state for the active tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].id === tabId) {
              chrome.storage.local.set({ isActive: true });
            }
          });
        } else if (response.status === 'removed') {
          activeTabsWithVideo.delete(tabId);
          
          // Update storage state for the active tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].id === tabId) {
              chrome.storage.local.set({ isActive: false });
            }
          });
        }
      }
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupAction') {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      const activeTab = tabs[0];
      const videoUrl = message.videoUrl || DEFAULT_VIDEO_URL;
      
      // Check if the video is currently active in this tab
      const isCurrentlyActive = activeTabsWithVideo.has(activeTab.id);
      
      // Toggle the video state
      if (isCurrentlyActive) {
        // Remove the video if it's active
        injectContentScriptAndToggleVideo(activeTab.id, false, videoUrl);
        chrome.storage.local.set({ isActive: false });
        sendResponse({ success: true, status: 'removed' });
      } else {
        // Add the video if it's not active
        injectContentScriptAndToggleVideo(activeTab.id, true, videoUrl);
        chrome.storage.local.set({ isActive: true });
        sendResponse({ success: true, status: 'added' });
      }
    });
    
    return true; // Indicates async response
  }
  
  // Action to check if video is active in current tab
  if (message.action === 'checkVideoState') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ active: false });
        return;
      }
      
      const activeTab = tabs[0];
      const isActive = activeTabsWithVideo.has(activeTab.id);
      
      // Update storage to match actual state
      chrome.storage.local.set({ isActive: isActive });
      
      sendResponse({ active: isActive });
    });
    
    return true; // Indicates async response
  }
  
  // Handle video closed by user
  if (message.action === 'videoWasClosed') {
    const tabId = sender.tab.id;
    if (activeTabsWithVideo.has(tabId)) {
      activeTabsWithVideo.delete(tabId);
      
      // Update storage state if this was the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id === tabId) {
          chrome.storage.local.set({ isActive: false });
        }
      });
    }
  }
});
