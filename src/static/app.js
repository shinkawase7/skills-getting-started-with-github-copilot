document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep default placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Normalize activities: support both object map and array
      const entries = Array.isArray(activities)
        ? activities.map(a => [a.name || a.title || "Unnamed", a])
        : Object.entries(activities || {});

      // Populate activities list
      entries.forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // store activity name for later reference (delete actions)
        activityCard.dataset.activity = name;

        const participants = Array.isArray(details && details.participants) ? details.participants : [];

        const maxParticipants = Number(details && details.max_participants) || 0;
        let spotsLeft = maxParticipants - participants.length;
        if (spotsLeft < 0) spotsLeft = 0;

        const participantItems = participants.length > 0
          ? participants.map(p => {
              const display = (p && typeof p === "object") ? (p.name || p.email || JSON.stringify(p)) : p;
              const escaped = escapeHtml(display || "");
              // include a delete button next to each participant
              return `<li>${escaped} <button class="delete-btn" data-email="${escaped}" aria-label="Remove participant">✖</button></li>`;
            }).join("")
          : "";

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details && details.description || "")}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details && details.schedule || "")}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <!-- Participants section -->
          <div class="participants-section">
            <h5>Participants</h5>
            ${participantItems ? `<ul class="participants-list">${participantItems}</ul>` : `<p class="no-participants">No participants yet</p>`}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Delegate click events for delete buttons inside activities list
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest && event.target.closest('.delete-btn');
    if (!btn) return;

    const li = btn.closest('li');
    const activityCard = btn.closest('.activity-card');
    if (!activityCard) return;

    const activityName = activityCard.dataset.activity;
    const email = btn.dataset.email;

    if (!activityName || !email) return;

    // Ask backend to unregister
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        messageDiv.textContent = result.message || `Removed ${email}`;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        // refresh activities list
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }

      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh activities so the newly-registered participant appears
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

// helper to escape HTML in participant names
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}
