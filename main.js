let state = {};

fetch('./translations.json')
    .then(response => response.json())
    .then(data => {
        initState(data);
        addTask();
    })
    .catch(error => {
        console.error('Ошибка загрузки translations.json:', error);
        initState({ ru: {}, en: {} });
    })
    .finally(() => renderAll());

const initState = (translations) => {
    state = {
        translations: translations,
        el: {
            html: document.documentElement,
            header: {
                title: document.getElementById('title'),
                langSelect: document.getElementById('langSelect'),
                themeSelect: document.getElementById('themeSelect'),
            },
            buttons: {
                addTaskBtn: document.getElementById('addTaskBtn'),
                exportToCSV: document.getElementById('exportToCSV'),
            },
            table: {
                taskName: document.getElementById('taskName'),
                estimation: document.getElementById('estimation'),
                expectedTime: document.getElementById('expectedTime'),
                stdDev: document.getElementById('stdDev'),
                variance: document.getElementById('variance'),
                optimistic: document.getElementById('optimistic'),
                mostLikely: document.getElementById('mostLikely'),
                pessimistic: document.getElementById('pessimistic'),
                tasks: document.getElementById('tasks'),
                totalTime: document.getElementById('totalTime'),
            },
            probability: {
                resultBlock: document.getElementById('resultBlock'),
                probabilities: document.getElementById('probabilities'),
            },
            description: document.getElementById('description'),
        },
        data: {
            theme: getCookie('theme') || 'light',
            language: getCookie('language') || 'ru',
            tasks: [],
            isTasksValid: false,
            probabilities: [
                {
                    percent: 50,
                    deviationsCount: 0,
                    value: 0,
                },
                {
                    percent: 75,
                    deviationsCount: 0.675,
                    value: 0,
                },
                {
                    percent: 95,
                    deviationsCount: 1.645,
                    value: 0,
                },
            ],
        }
    }
};

const setCookie = (name, value) => {
    const d = new Date();
    d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

const getCookie = (name) => {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) return value;
    }
    return null;
}

const toggleTheme = () => {
    state.data.theme = state.data.theme === 'dark' ? 'light' : 'dark';
    setCookie('theme', state.data.theme);
    renderTheme();
}

const selectLanguage = () => {
    state.data.language = state.el.header.langSelect.value;
    setCookie('language', state.data.language);
    renderLanguage();
}

const changeTaskName = (input, index) => {
    state.data.tasks[index].name = input.value;
}

const changeEstimation = (input, index) => {
    state.data.tasks[index][input.name] = parseFloat(input.value) || 0;
    recalculate(index);
    renderResult();
}

const addTask = () => {
    state.data.tasks.push({
        name: '',
        optimistic: 0,
        mostLikely: 0,
        pessimistic: 0,
        expectedTime: 0,
        stdDev: 0,
        variance: 0,
        isValid: false,
    });
    renderResult();
};

const removeTask = (index) => {
    state.data.tasks.splice(index, 1);
    recalculate();
    renderResult();
};

const recalculate = (index) => {
    if (index !== undefined) {
        const task = state.data.tasks[index];
        task.isValid = task.optimistic > 0 && task.mostLikely > 0 && task.pessimistic > 0;
        task.expectedTime = (task.optimistic + 4 * task.mostLikely + task.pessimistic) / 6;
        task.stdDev = (task.pessimistic - task.optimistic) / 6;
        task.variance = task.stdDev ** 2;
    }

    state.data.isTasksValid = state.data.tasks.length > 0 && state.data.tasks.every(task => task.isValid);

    if (state.data.isTasksValid) {
        const expectedTimeSum = state.data.tasks.reduce((acc, task) => acc + task.expectedTime, 0);
        const varianceSum = state.data.tasks.reduce((acc, task) => acc + task.variance, 0);
        state.data.probabilities = state.data.probabilities.map((probability) => {
            probability.value = probability.deviationsCount * varianceSum ** 0.5 + expectedTimeSum;
            return probability;
        });
    }
};

const exportToCSV = () => {
    const lang = state.data.language;
    const translationsForLang = state.translations[lang];

    let csvContent = 'data:text/csv;charset=utf-8,';

    const headers = [
        translationsForLang.taskName,
        translationsForLang.expectedTime
    ];
    csvContent += headers.join(',') + '\n';

    state.data.tasks.forEach((task, index) => {
        const rowData = [
            task.name,
            task.expectedTime.toFixed(1)
        ];
        csvContent += rowData.join(',') + '\n';
    });

    csvContent += `${state.translations[lang].probabilityLabel},\n`;

    state.data.probabilities.forEach((probability) => {
        const rowData = [
            `${probability.percent}%`,
            probability.value.toFixed(1)
        ];
        csvContent += rowData.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = 'tasks-estimation.csv';
    a.click();
};

const renderAll = () => {
    renderTheme();
    renderLanguage();
    renderResult();
}

const renderTheme = () => {
    state.el.html.setAttribute('data-theme', state.data.theme);
    state.el.header.themeSelect.textContent = state.data.theme === 'light' ? '☀️' : '🌙';
}

const renderLanguage = () => {
    const lang = state.data.language;
    document.title = state.translations[lang].title;
    Object.keys(state.translations[lang]).forEach(id => {
        if (document.getElementById(id)) {
            document.getElementById(id).innerHTML = state.translations[lang][id];
        }
    });

    state.el.header.langSelect.value = lang;
}

const renderResult = () => {
    state.el.table.tasks.innerHTML = state.data.tasks
        .map((task, index) => getTaskHtml(task, index))
        .join("\n");

    if (state.data.isTasksValid) {
        state.el.table.totalTime.textContent = state.data.tasks
            .reduce((acc, task) => acc + task.expectedTime, 0)
            .toFixed(1);

        state.el.probability.resultBlock.style.visibility = 'visible';

        state.el.probability.probabilities.innerHTML = state.data.probabilities
            .map((probability) => `<li><b>${probability.percent}%</b> - ${probability.value.toFixed(1)}</li>`)
            .join("\n");
    } else {
        state.el.table.totalTime.textContent = '';
        state.el.probability.resultBlock.style.visibility = 'hidden';
        state.el.probability.probabilities.innerHTML = '';
    }
}

const getTaskHtml = (task, index) => {
    return `
        <tr>
            <td><input type="text" value="${task.name}" oninput="changeTaskName(this, ${index})" /></td>
            <td><input name="optimistic" type="number" min="0" value="${task.optimistic}" onchange="changeEstimation(this, ${index})" /></td>
            <td><input name="mostLikely" type="number" min="0" value="${task.mostLikely}" onchange="changeEstimation(this, ${index})" /></td>
            <td><input name="pessimistic" type="number" min="0" value="${task.pessimistic}" onchange="changeEstimation(this, ${index})" /></td>
            <td>${task.isValid ? task.expectedTime.toFixed(1) : ''}</td>
            <td><button class='remove-task' onclick='removeTask(${index})'>❌</button></td>
        </tr>
        `;
}
