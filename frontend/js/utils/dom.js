/**
 * DOM Utility Functions
 * Helper functions for DOM manipulation
 */

// Get element by ID with type safety
export function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element not found: ${id}`);
  }
  return element;
}

// Get all elements matching selector
export function getElements(selector) {
  return document.querySelectorAll(selector);
}

// Add class to element
export function addClass(element, className) {
  if (element) {
    element.classList.add(className);
  }
}

// Remove class from element
export function removeClass(element, className) {
  if (element) {
    element.classList.remove(className);
  }
}

// Toggle class on element
export function toggleClass(element, className) {
  if (element) {
    element.classList.toggle(className);
  }
}

// Show element
export function show(element) {
  if (element) {
    element.style.display = "";
    element.classList.remove("hidden");
  }
}

// Hide element
export function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

// Set text content safely
export function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

// Set HTML content safely (escaped)
export function setHtml(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Clear element content
export function clear(element) {
  if (element) {
    element.innerHTML = "";
  }
}

// Scroll element to bottom
export function scrollToBottom(element) {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

// Create element with attributes
export function createElement(tag, attributes = {}, content = "") {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "textContent") {
      element.textContent = value;
    } else if (key.startsWith("data-")) {
      element.dataset[key.slice(5)] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  if (content) {
    element.innerHTML = content;
  }
  return element;
}

// Disable element
export function disable(element) {
  if (element) {
    element.disabled = true;
  }
}

// Enable element
export function enable(element) {
  if (element) {
    element.disabled = false;
  }
}

// Get form data as object
export function getFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

// Set focus on element
export function focus(element) {
  if (element) {
    element.focus();
  }
}
