"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// med_calc_server/src/server.ts
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// --- Хранилище данных (использование JSON-файла) ---
// Путь к файлу, где будут храниться все данные пациентов.
// path.resolve() нужен для создания абсолютного пути, независимо от того, откуда запускается скрипт.
// __dirname - это текущая директория (dist/ в скомпилированном виде).
// Мы идем на уровень выше (dist/ -> med_calc_server/) и затем в data/.
const DATA_FILE = path_1.default.resolve(__dirname, '../data/patients.json');
// Функция для чтения данных из JSON-файла
const readPatientsData = () => {
    try {
        // Проверяем, существует ли файл
        if (!fs_1.default.existsSync(DATA_FILE)) {
            // Если файла нет, создаем пустой массив JSON и записываем его
            fs_1.default.writeFileSync(DATA_FILE, '[]', 'utf8');
            return [];
        }
        // Если файл существует, читаем и парсим его
        const data = fs_1.default.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Ошибка при чтении данных пациентов:', error);
        // В случае любой другой ошибки, возвращаем пустой массив, чтобы приложение не упало
        return [];
    }
};
// Функция для записи данных в JSON-файл
const writePatientsData = (data) => {
    try {
        fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
    catch (error) {
        console.error('Ошибка при записи данных пациентов:', error);
    }
};
// --- Настройка Express-приложения ---
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// --- Важные изменения здесь ---
// 1. Указываем путь к папке со статическими файлами клиента
// Эта папка должна содержать скомпилированный клиент (index.html, JS, CSS и т.д.)
// Мы предполагаем, что после сборки клиента вы скопируете содержимое client/build
// в server/public.
const clientBuildPath = path_1.default.resolve(__dirname, '../public'); // <-- Путь к статическим файлам клиента
// Middleware
// Отключаем CORS для всех запросов, потому что теперь клиент и сервер будут на одном источнике.
// Если клиент запрашивает статические файлы с того же порта, CORS не нужен.
// Если API-запросы идут на тот же порт, CORS тоже не нужен.
// app.use(cors({ origin: 'http://localhost:3000' })); // Закомментируйте или удалите эту строку!
app.use(body_parser_1.default.json()); // Парсинг JSON-тел запросов
// Обслуживание статических файлов
// Это middleware должно идти ДО ваших API-эндпоинтов, чтобы сначала проверялись статические файлы.
app.use(express_1.default.static(clientBuildPath));
app.use((0, cors_1.default)({ origin: 'http://localhost:3000' }));
// --- API-эндпоинты ---
// Все ваши API-эндпоинты должны быть ПЕРЕД блоком, который отправляет index.html
// для всех остальных запросов. Иначе запросы к /api будут перехватываться.
// GET /api/patients - Получить список всех пациентов (только ID и имя)
app.get('/api/patients', (req, res) => {
    const patients = readPatientsData();
    const patientList = patients.map(({ id, reportName }) => ({ id, reportName }));
    res.json(patientList);
});
// GET /api/patients/:id - Получить данные для конкретного пациента
app.get('/api/patients/:id', (req, res) => {
    const patientId = req.params.id;
    const patients = readPatientsData();
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
        res.json(patient);
    }
    else {
        res.status(404).json({ message: 'Пациент не найден' });
    }
});
// POST /api/patients - Создать нового пациента или обновить существующего
app.post('/api/patients', (req, res) => {
    const { id, name, cells, pdfConclusion1, pdfConclusion2, doctorName, reportName, date, weight, height, age, sex } = req.body;
    let patients = readPatientsData();
    const index = patients.findIndex(p => p.id === id);
    let updatedPatient;
    if (index !== -1) {
        updatedPatient = {
            ...patients[index],
            name,
            cells,
            pdfConclusion1,
            pdfConclusion2,
            doctorName,
            reportName,
            date,
            weight,
            height,
            age,
            sex
        };
        patients[index] = updatedPatient;
        writePatientsData(patients);
        console.log(`Пациент с ID ${id} обновлен.`);
        return res.status(200).json(updatedPatient);
    }
    else {
        updatedPatient = {
            id,
            name,
            cells,
            pdfConclusion1,
            pdfConclusion2,
            doctorName,
            reportName,
            date,
            weight,
            height,
            age,
            sex
        };
        patients.push(updatedPatient);
        writePatientsData(patients);
        console.log(`Новый пациент с ID ${id} создан.`);
        return res.status(201).json(updatedPatient);
    }
});
// DELETE /api/patients/:id - Удалить пациента
app.delete('/api/patients/:id', (req, res) => {
    const patientId = req.params.id;
    let patients = readPatientsData();
    const initialLength = patients.length;
    patients = patients.filter(p => p.id !== patientId);
    if (patients.length < initialLength) {
        writePatientsData(patients);
        res.status(204).send();
    }
    else {
        res.status(404).json({ message: 'Пациент не найден для удаления' });
    }
});
app.delete("/api/clear_patients", (req, res) => {
    writePatientsData([]);
    res.status(204).send();
});
// --- Обработка всех остальных запросов (для React Router) ---
// Этот middleware должен идти ПОСЛЕ всех ваших API-эндпоинтов
// Он гарантирует, что для любого запроса, который не является API или статическим файлом,
// будет отправлен index.html вашего React-приложения.
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
// --- Запуск сервера ---
app.listen(PORT, () => {
    const dataDir = path_1.default.resolve(__dirname, '../data');
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir);
    }
    readPatientsData();
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Обслуживание статических файлов из: ${clientBuildPath}`);
});
