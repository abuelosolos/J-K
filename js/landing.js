// js/landing.js

function toggleFAQ(btn) {
    var item = btn.parentElement;
    var isOpen = item.classList.contains('open');
    // close all open items
    document.querySelectorAll('.faq-item').forEach(function(el) {
      el.classList.remove('open');
    });
    // open this one if it was closed
    if (!isOpen) item.classList.add('open');
  }