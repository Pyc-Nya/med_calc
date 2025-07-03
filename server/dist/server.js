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
const PORT = process.env.PORT || 3001; // Порт, на котором будет работать сервер (по умолчанию 3001)
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000' // Разрешить запросы только с этого источника
}));
app.use(body_parser_1.default.json()); // Парсинг JSON-тел запросов
// --- API-эндпоинты ---
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
    let patients = readPatientsData(); // Читаем текущие данные всех пациентов
    // Ищем пациента по предоставленному ID
    const index = patients.findIndex(p => p.id === id);
    let updatedPatient;
    if (index !== -1) {
        // Если пациент с таким ID найден, обновляем его данные
        updatedPatient = {
            ...patients[index], // Копируем существующие данные
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
        patients[index] = updatedPatient; // Заменяем старые данные в массиве
        writePatientsData(patients); // Сохраняем обновлённый массив в файл
        console.log(`Пациент с ID ${id} обновлен.`);
        return res.status(200).json(updatedPatient); // 200 OK для успешного обновления
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
        patients.push(updatedPatient); // Добавляем нового пациента в массив
        writePatientsData(patients); // Сохраняем обновлённый массив в файл
        console.log(`Новый пациент с ID ${id} создан.`);
        return res.status(201).json(updatedPatient); // 201 Created для нового ресурса
    }
});
// DELETE /api/patients/:id - Удалить пациента (добавим для полноты)
app.delete('/api/patients/:id', (req, res) => {
    const patientId = req.params.id;
    let patients = readPatientsData();
    const initialLength = patients.length;
    patients = patients.filter(p => p.id !== patientId);
    if (patients.length < initialLength) {
        writePatientsData(patients);
        res.status(204).send(); // 204 No Content для успешного удаления
    }
    else {
        res.status(404).json({ message: 'Пациент не найден для удаления' });
    }
});
app.delete("/api/clear_patients", (req, res) => {
    writePatientsData([]);
    res.status(204).send(); // 204 No Content для успешного удаления
});
// --- Запуск сервера ---
app.listen(PORT, () => {
    // Убедимся, что папка data существует при запуске сервера
    const dataDir = path_1.default.resolve(__dirname, '../data');
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir);
    }
    // И убедимся, что файл patients.json создан, если его нет
    readPatientsData(); // Это вызовет создание файла, если его нет
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
