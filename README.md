# StudyOS — Study Consistency Tracker

A first-version study dashboard built with plain HTML, CSS, and JavaScript for tracking 2ème Bac study sessions.

## Run it
1. Extract `studyos.zip` into a folder.
2. Open `index.html` in your browser (Chrome or Brave recommended).
3. Log each study session using the form.
4. Your data is saved in that browser's local storage.

No installation, server, account, or internet connection is required for the core app. The optional Google Fonts import improves typography; the system fallback fonts still work offline.

## Features
- Weekly study hours and configurable weekly target
- Weekly consistency percentage (days with at least one logged session / 7)
- Current study streak
- Exercises completed this week
- Weekly activity bar chart
- Subject time breakdown
- 12-week consistency map
- Manual session log with date, subject, duration, exercises, and lesson note
- Delete individual sessions
- Export all data as a JSON backup
- Local persistence through `localStorage`
- Responsive layout for desktop and mobile

## Important
- Records stay in the local browser profile on this device. They are not automatically synced between devices or browsers.
- Clearing browser data may remove the records, so use **Export data** occasionally.
- This is a personal tracker, not a replacement for an official school schedule.
- To change the subjects, edit the options in `index.html`.
- Main logic is in `app.js`; design is in `style.css`.

## Learning path
1. Read `index.html` and identify the dashboard sections.
2. Change colors and spacing in `style.css`.
3. In `app.js`, find `render()` to see how the stats are calculated.
4. Add a feature such as a daily notes field or monthly report.
