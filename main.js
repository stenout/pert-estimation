let translations = {};

fetch('./translations.json')
    .then(response => response.json())
    .then(data => {
        translations = data;
        init();
    })
    .catch(error => console.error('Ошибка загрузки translations.json:', error));

function init() {
    loadPreferences();
    addTask();
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) return value;
    }
    return null;
}

function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById("themeIcon");
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    themeIcon.textContent = newTheme === "dark" ? "🌙" : "☀️";
    setCookie("theme", newTheme, 365);
}

function selectLanguage() {
    const langSelect = document.getElementById("langSelect");
    const newLang = langSelect.value;
    setCookie("language", newLang, 365);
    applyLanguage(newLang);
}

function applyLanguage(lang) {
    document.title = translations[lang].title;
    Object.keys(translations[lang]).forEach(id => {
        if (document.getElementById(id)) {
            document.getElementById(id).innerHTML = translations[lang][id];
        }
    });
}

function loadPreferences() {
    const savedTheme = getCookie("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("themeIcon").textContent = savedTheme === "dark" ? "🌙" : "☀️";

    const savedLang = getCookie("language") || "ru";
    document.getElementById("langSelect").value = savedLang;
    applyLanguage(savedLang);
}

function calculatePert(o, m, p) {
    return ((o + 4 * m + p) / 6).toFixed(1);
}

function calculateStdDev(o, p) {
    return ((p - o) / 6).toFixed(1);
}

function updateTotalTime() {
    let totalTime = 0;
    let totalDeviation = 0;
    document.querySelectorAll('.task-time').forEach(cell => {
        totalTime += parseFloat(cell.textContent) || 0;
    });
    document.querySelectorAll('.task-stddev').forEach(cell => {
        totalDeviation += parseFloat(cell.textContent) || 0;
    });
    document.getElementById('totalTime').textContent = totalTime.toFixed(1);
    document.getElementById('totalDeviation').textContent = totalDeviation.toFixed(1);
}

function addTask() {
    const tableBody = document.getElementById('taskTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
          <td><input type="text" /></td>
          <td><input type="number" min="0" oninput="recalculate(this)" /></td>
          <td><input type="number" min="0" oninput="recalculate(this)" /></td>
          <td><input type="number" min="0" oninput="recalculate(this)" /></td>
          <td class="task-time">0</td>
          <td class="task-stddev">0</td>
          <td><button class="remove-task" onclick="removeTask(this)">❌</button></td>
        `;
    tableBody.appendChild(row);
    recalculate(row.querySelector('input'));
}

function recalculate(input) {
    const row = input.closest('tr');
    const values = row.querySelectorAll('input[type=number]');
    const o = parseFloat(values[0].value) || 0;
    const m = parseFloat(values[1].value) || 0;
    const p = parseFloat(values[2].value) || 0;
    row.querySelector('.task-time').textContent = calculatePert(o, m, p);
    row.querySelector('.task-stddev').textContent = calculateStdDev(o, p);
    updateTotalTime();
}

function removeTask(button) {
    button.closest('tr').remove();
    updateTotalTime();
}

function exportToCSV() {
    const lang = getCookie("language") || "ru";
    const translationsForLang = translations[lang];

    let csvContent = "data:text/csv;charset=utf-8,";

    const headers = [
        translationsForLang.taskName,
        translationsForLang.expectedTime,
        translationsForLang.stdDeviation
    ];
    csvContent += headers.join(",") + "\n";

    document.querySelectorAll('#taskTableBody tr').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const taskName = inputs[0].value || translationsForLang.newTask;
        const averageTime = row.querySelector('.task-time').textContent;
        const stdDeviation = row.querySelector('.task-stddev').textContent;

        const rowData = [
            taskName,
            averageTime,
            stdDeviation
        ];
        csvContent += rowData.join(",") + "\n";
    });

    csvContent += `${translationsForLang.totalTimeLabel},${document.getElementById('totalTime').textContent}\n`;
    csvContent += `${translationsForLang.totalDeviationLabel},${document.getElementById('totalDeviation').textContent}\n`;

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = 'tasks-estimation.csv';
    a.click();
}
