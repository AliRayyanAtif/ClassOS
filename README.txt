ClassWork OS: Introduction to ICT web project
================================================

What it is
----------
A class-work tracker for university students. Add assignments, quizzes,
projects, presentations and exam dates, then see what's next, what's
urgent, and get a day-by-day study plan.

There is NO login and NO server/database. Everything a visitor adds is
saved in their own browser's localStorage (see "How data is saved" below).


How to run it
-------------
Option A (recommended): open the folder in VS Code and use the
"Live Server" extension, then open index.html.
Option B: upload the folder to GitHub Pages / Netlify.
Option C: double-click index.html. This works too.

On the very first visit the site adds a few sample tasks and dates so
it is not empty. They can be deleted, or cleared all at once from the
Feedback page ("Clear all my data").


The six pages
-------------
1. index.html          Home: intro, purpose, live dashboard, links to every page
2. explore.html        Class Work: type filter, status filter, sort, task cards
3. details.html        Task Details: details.html?id=... opens a modal card with shows countdown, info table, notes,
                       step-by-step guide, related tasks, course exam dates, prev/next task
4. interactive.html    Planner: study-plan generator (earliest-deadline-first) + exams & dates schedule
5. contact.html        Feedback: validated form (honest success message, nothing is sent),
                       export / sample / clear data controls
6. topic-specific.html Study Tips: technique cards with show/hide steps, FAQ


Folder structure
----------------
index.html, explore.html, details.html, interactive.html,
contact.html, topic-specific.html
css/style.css     one external stylesheet (sections numbered 1–9)
js/script.js      one script for all pages (sections numbered 1–13);
                  <body data-page="..."> decides which page code runs
images/           SVG illustrations and icons (all have alt text)


JavaScript features (rubric checklist)
--------------------------------------
- Form validation: feedback form (per-field errors, live re-checking),
  task / date / course dialogs, planner settings
- DOM manipulation: dashboard, task cards, details page, plan output,
  schedule, toasts, modals are all built and updated by JS
- Conditional logic: overdue / due-soon colours, plan verdict
  (Comfortable / Tight / Overloaded), greeting by time of day,
  countdown labels
- Extra features: study-plan generator, filtering & sorting, tabs,
  expandable sections, task pop-up, localStorage


How data is saved (js/script.js, section 1)
-------------------------------------------
Each list (tasks, dates, courses, preferences) is converted to a JSON
string with JSON.stringify() and saved with localStorage.setItem(),
e.g. the key "cw_tasks". loadData() reads it back with
localStorage.getItem() and JSON.parse(). The data stays until the
user clears their browser data.
