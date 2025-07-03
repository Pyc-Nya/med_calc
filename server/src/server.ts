// med_calc_server/src/server.ts
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Импорт для генерации уникальных ID

// --- Определение типов данных для пациентов ---
// Эти типы должны быть согласованы с тем, что вы ожидаете от клиента
// и как это будет храниться на сервере.

// Типы для ячеек таблицы
export type EditableCellId =
  "G6" | "H6" | "J6" | "K6" |
  "G7" | "H7" | "J7" | "K7" |
  "G8" | "H8" | "J8" | "K8" |
  "H10" | "K10" |
  "H11" | "K11" |
  "H12" | "K12" |
  "H13" | "K13";

export type PatientCells = {
  [key in EditableCellId]: {
    value: string;
    id: EditableCellId;
  };
};

// Интерфейс полной информации о пациенте
export interface PatientData {
  id: string;        // Уникальный ID пациента
  name: string;      // Имя пациента (для отображения в списке)
  cells: PatientCells; // Данные редактируемых ячеек таблицы
  pdfConclusion1: string; // Текст первого заключения для PDF
  pdfConclusion2: string; // Текст второго заключения для PDF
}

// --- Хранилище данных (использование JSON-файла) ---
// Путь к файлу, где будут храниться все данные пациентов.
// path.resolve() нужен для создания абсолютного пути, независимо от того, откуда запускается скрипт.
// __dirname - это текущая директория (dist/ в скомпилированном виде).
// Мы идем на уровень выше (dist/ -> med_calc_server/) и затем в data/.
const DATA_FILE = path.resolve(__dirname, '../data/patients.json');

// Функция для чтения данных из JSON-файла
const readPatientsData = (): PatientData[] => {
  try {
    // Проверяем, существует ли файл
    if (!fs.existsSync(DATA_FILE)) {
      // Если файла нет, создаем пустой массив JSON и записываем его
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    // Если файл существует, читаем и парсим его
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data) as PatientData[];
  } catch (error) {
    console.error('Ошибка при чтении данных пациентов:', error);
    // В случае любой другой ошибки, возвращаем пустой массив, чтобы приложение не упало
    return [];
  }
};

// Функция для записи данных в JSON-файл
const writePatientsData = (data: PatientData[]): void => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка при записи данных пациентов:', error);
  }
};

// --- Настройка Express-приложения ---
const app = express();
const PORT = process.env.PORT || 3001; // Порт, на котором будет работать сервер (по умолчанию 3001)

// Middleware
app.use(cors({
  origin: 'http://localhost:3000' // Разрешить запросы только с этого источника
}));
app.use(bodyParser.json()); // Парсинг JSON-тел запросов

// --- API-эндпоинты ---

// GET /api/patients - Получить список всех пациентов (только ID и имя)
app.get('/api/patients', (req, res) => {
  const patients = readPatientsData();
  const patientList = patients.map(({ id, name }) => ({ id, name }));
  res.json(patientList);
});

// GET /api/patients/:id - Получить данные для конкретного пациента
app.get('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  const patients = readPatientsData();
  const patient = patients.find(p => p.id === patientId);

  if (patient) {
    res.json(patient);
  } else {
    res.status(404).json({ message: 'Пациент не найден' });
  }
});

// POST /api/patients - Создать нового пациента или обновить существующего
app.post('/api/patients', (req: any, res: any) => {
  const { id, name, cells, pdfConclusion1, pdfConclusion2 } = req.body as PatientData;
  let patients = readPatientsData();

  if (!name || !cells) {
    return res.status(400).json({ message: 'Имя и данные ячеек обязательны.' });
  }

  let updatedPatient: PatientData;

  if (id) {
    // Если ID предоставлен, пробуем обновить существующего пациента
    const index = patients.findIndex(p => p.id === id);
    if (index !== -1) {
      updatedPatient = { ...patients[index], name, cells, pdfConclusion1, pdfConclusion2 };
      patients[index] = updatedPatient;
      writePatientsData(patients);
      return res.status(200).json(updatedPatient);
    }
    // Если ID предоставлен, но пациент не найден, создаем нового с этим ID (или можно вернуть 404/400)
    // В данном случае, мы создадим нового, чтобы не усложнять логику клиента
  }

  // Создать нового пациента (генерируем новый ID, если не был предоставлен или найден)
  const newId = uuidv4();
  updatedPatient = { id: newId, name, cells, pdfConclusion1, pdfConclusion2 };
  patients.push(updatedPatient);
  writePatientsData(patients);
  return res.status(201).json(updatedPatient); // 201 Created для нового ресурса
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
  } else {
    res.status(404).json({ message: 'Пациент не найден для удаления' });
  }
});


// --- Запуск сервера ---
app.listen(PORT, () => {
  // Убедимся, что папка data существует при запуске сервера
  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  // И убедимся, что файл patients.json создан, если его нет
  readPatientsData(); // Это вызовет создание файла, если его нет
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});