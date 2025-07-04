import { makeAutoObservable, runInAction } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { makeFetch } from "./myfetch";


export type tableCell = {
  editable: boolean,
  value: string,
  isBold: boolean,
  id: string
}

const EDITABLE_CELL_IDS = [
  "G6", "H6", "J6", "K6",
  "G7", "H7", "J7", "K7",
  "G8", "H8", "J8", "K8",
  "H10", "K10",
  "H11", "K11",
  "H12", "K12",
  "H13", "K13",
] as const; 

type EditableCellId = (typeof EDITABLE_CELL_IDS)[number];

type editableCell = {
  value: string,
  id: EditableCellId
}

type patientData = {
  name: string,
  age: number,
  sex: string,
  height: number,
  weight: number,
  date: string
}

type screen = {
  id: string,
  name: string
}

const mockCells: Record<EditableCellId, editableCell> = {
  G6: {value: "", id: "G6"},
  H6: {value: "", id: "H6"},
  J6: {value: "", id: "J6"},
  K6: {value: "", id: "K6"},

  G7: {value: "", id: "G7"},
  H7: {value: "", id: "H7"},
  J7: {value: "", id: "J7"},
  K7: {value: "", id: "K7"},

  G8: {value: "", id: "G8"},
  H8: {value: "", id: "H8"},
  J8: {value: "", id: "J8"},
  K8: {value: "", id: "K8"},

  H10: {value: "", id: "H10"},
  K10: {value: "", id: "K10"},

  H11: {value: "", id: "H11"},
  K11: {value: "", id: "K11"},

  H12: {value: "", id: "H12"},
  K12: {value: "", id: "K12"},

  H13: {value: "", id: "H13"},
  K13: {value: "", id: "K13"},
}

const mockPatient = {
  name: "Иванов Иван Иванович",
  age: 0,
  sex: "Мужской",
  height: 0,
  weight: 0,
  date: ""
}

type Row = [tableCell, tableCell, tableCell, tableCell, tableCell, tableCell, tableCell, tableCell];
interface command {
  undo: () => void,
  redo: () => void
}

class Store {
  toFixedValue = 2;
  pdfConclusion1 = "";
  pdfConclusion2 = "";
  patient: patientData = mockPatient;
  patientsCache: Record<string, PatientServerData> = {};
  doctorName: string = "Иванов И.И.";
  screens: Record<string, screen> = {};
  activeScreenId: string = "main";
  patientList: {id: string, reportName: string}[] = [];
  private h9 = 0;
  private k9 = 0;
  private m7 = 0;
  private m9 = 0;
  private m12 = 0;
  private m13 = 0;
  private undoStack: command[] = [];
  private redoStack: command[] = [];
  cells: Record<EditableCellId, editableCell> = mockCells;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  private get (id: EditableCellId): number {
    try {
      return parseLocalizedNumber(this.cells[id].value);
    } catch {
      return 0;
    }
  }
  
  private _setCell(id: EditableCellId, value: string) {
    const allowedCharsRegex = /^-?[0-9]*[.,]?[0-9]*$/;

    if (allowedCharsRegex.test(value)) {
      this.cells[id].value = value;
    } else {
      console.warn(
        `Invalid input for cell ${id}: "${value}". Only numbers, '.', ',', and '-' are allowed.`
      );
    }
  }

  set(id: EditableCellId, value: string) {
    const oldValue = this.cells[id].value;

    // Only record if the value actually changes and it's a valid input
    if (oldValue !== value && /^-?[0-9]*[.,]?[0-9]*$/.test(value)) {
      this._setCell(id, value); // Use the private setter

      this.undoStack.push({
        undo: () => this._setCell(id, oldValue), // Use private setter for undo
        redo: () => this._setCell(id, value), // Use private setter for redo
      });
      this.redoStack = []; // Clear redoStack on a new action
      this.updatePdfConclusion(this.initialConclusion1, 1);
      this.updatePdfConclusion(this.initialConclusion2, 2);
    } else if (oldValue === value && /^-?[0-9]*[.,]?[0-9]*$/.test(value)) {
      // Even if the value didn't change, update the cell if the input is valid.
      // This handles cases where user types, deletes, and re-types the same value.
      this._setCell(id, value);
    } else if (!/^-?[0-9]*[.,]?[0-9]*$/.test(value)) {
      console.warn(
        `Invalid input for cell ${id}: "${value}". Only numbers, '.', ',', and '-' are allowed.`
      );
    }
  }

  get initialConclusion1() {
    return this.conclusions.slice(0, 4).join('\n');
  }

  get initialConclusion2() {
    return this.conclusions.slice(4).join('\n');
  }

  updatePatientName (name: string) { this.patient.name = name;  }
  updatePatientAge (age: number) { this.patient.age = age;  }
  updatePatientSex (sex: string) { this.patient.sex = sex;  }
  updatePatientHeight (height: number) { this.patient.height = height;  }
  updatePatientWeight (weight: number) { this.patient.weight = weight;  }
  updatePatientDate (date: string) { this.patient.date = date; }

  updateActiveScreen (id: string) { 
    if (this.activeScreenId !== "main" && this.screens[this.activeScreenId]) {
      this.patientsCache[this.activeScreenId] = {
        ...this.patient,
        cells: this.cells,
        doctorName: this.doctorName,
        reportName: this.screens[this.activeScreenId].name,
        id: this.activeScreenId,
        pdfConclusion1: this.pdfConclusion1,
        pdfConclusion2: this.pdfConclusion2
      };
    }
    if (id !== "main" && this.patientsCache[id]) {
      this.cells = this.patientsCache[id].cells;
      this.patient = this.patientsCache[id];
      this.doctorName = this.patientsCache[id].doctorName;

      requestAnimationFrame(() => {
        runInAction(() => {
          this.pdfConclusion1 = this.patientsCache[id].pdfConclusion1;
          this.pdfConclusion2 = this.patientsCache[id].pdfConclusion2;
        })
      })
    }
    this.activeScreenId = id; 
  }
  createNewPatient () { 
    this.patient = mockPatient; 
    this.cells = mockCells;
    const id = uuidv4();
    this.screens[id] = { id: id, name: "Новый Пациент" };
    this.updateActiveScreen(id);
  }
  updateScreenName (id: string, name: string) { this.screens[id].name = name; }
  deleteScreen (id: string) { 
    delete this.screens[id]; 
    this.updateActiveScreen("main");
  }

  getLocaleDate(): string {
    let formattedDate = this.patient.date;

    if (this.patient.date) {
      const dateParts = this.patient.date.split('-');
      // Ensure dateParts has 3 elements and they are valid numbers
      if (dateParts.length === 3 && dateParts.every(part => !isNaN(Number(part)))) {
        // Construct a Date object (month is 0-indexed, so subtract 1)
        const dateObj = new Date(
          parseInt(dateParts[0]), // Year
          parseInt(dateParts[1]) - 1, // Month (0-11)
          parseInt(dateParts[2]) // Day
        );

        // Check if the dateObj is a valid date
        if (!isNaN(dateObj.getTime())) {
          // Format the date using toLocaleDateString for Russian locale
          formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }
    }

    return formattedDate;
  }

  get patientDataString() {
    return `Имя: ${this.patient.name}\nВозраст: ${this.patient.age}\nПол: ${this.patient.sex}\nРост (см): ${this.patient.height}\nВес (кг): ${this.patient.weight}\nДата обследования: ${this.getLocaleDate()}`
  }

  updateDoctorName (name: string) { this.doctorName = name;  }

  updateToFixedValue(value: number) {
    this.toFixedValue = value;
  }

  updatePdfConclusion (text: string, number: 1 | 2) {
    if (number === 1) {
      this.pdfConclusion1 = text;
    } else {
      this.pdfConclusion2 = text;
    }
  }

  get storeState() {
    return {cells: this.cells, toFixedValue: this.toFixedValue, pdfConclusion1: this.pdfConclusion1, pdfConclusion2: this.pdfConclusion2};
  }

  setStoreState(state: typeof this.storeState) {
    runInAction(() => {
      this.cells = state.cells;
      this.toFixedValue = state.toFixedValue;
      this.pdfConclusion1 = state.pdfConclusion1;
      this.pdfConclusion2 = state.pdfConclusion2;
    });
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const keyCode = event.code;
    if (!event.ctrlKey) return;

    if (keyCode === "KeyZ") {
      const commandToUndo = this.undoStack.pop();
      if (!commandToUndo || this.activeScreenId === "main") return;
      commandToUndo.undo();
      this.redoStack.push(commandToUndo);
    } else if (keyCode === "KeyY") {
      const commandToRedo = this.redoStack.pop();
      if (!commandToRedo || this.activeScreenId === "main") return;
      commandToRedo.redo();
      this.undoStack.push(commandToRedo);
    }
    if (keyCode === "KeyS") {
      event.preventDefault();
      if (this.activeScreenId === "main") return;
      this.savePatient();
    }
  };

  get row1(): Row { 
    return [
      {editable: false, value: "Анализируемый показатель", isBold: true, id: "F5"},
      {editable: false, value: "Абсолютные до ингаляции", isBold: true, id: "G5"},
      {editable: false, value: "Значение до ингаляции бронхолитика", isBold: true, id: "H5"},
      {editable: false, value: "Степень нарушений", isBold: true, id: "I5"},
      {editable: false, value: "Абсолютные после ингаляции", isBold: true, id: "J5"},
      {editable: false, value: "Значение после ингаляции бронхолитика", isBold: true, id: "K5"},
      {editable: false, value: "Степень нарушений", isBold: true, id: "L5"},
      {editable: false, value: "Разница", isBold: true, id: "M5"},
    ]
  }

  private get row2(): Row {
    return [
      {editable: false, value: "Дыхательный импеданс (Z5)", isBold: true, id: "F6"},
      {editable: true, value: this.cells["G6"].value, isBold: false, id: "G6"},
      {editable: true, value: this.cells["H6"].value, isBold: false, id: "H6"},
      {
        editable: false, 
        value: this.get("H6") <= 144
          ? "Норма"
          : this.get("H6") <= 170
          ? "Умеренно увеличен"
          : this.get("H6") <= 215
          ? "Значительно увеличен"
          : "Резко увеличен", 
        isBold: false, 
        id: "I6"
      },
      {editable: true, value: this.cells["J6"].value, isBold: false, id: "J6"},
      {editable: true, value: this.cells["K6"].value, isBold: false, id: "K6"},
      {
        editable: false,
        value: this.get("K6") <= 144
          ? "Норма"
          : this.get("K6") <= 170
            ? "Умеренно увеличен"
            : this.get("K6") <= 215
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "L6" 
      },
      {editable: false, value: "", isBold: false, id: "M6"},
    ]
  }

  private get row3(): Row {

    const g7Value = this.get("G7");
    let m7Value: string;
    if (g7Value === 0) {
      m7Value = "#DIV/0!";
    } else {
      m7Value = roundNumber(((this.get("J7") - g7Value) / g7Value) * 100, this.toFixedValue);

      runInAction(() => {
        this.m7 = ((this.get("J7") - g7Value) / g7Value) * 100;
      })
    }

    return [
      {editable: false, value: "Резистивное сопротивление на частоте 5 Гц (Rrs5)", isBold: true, id: "F7"},
      {editable: true, value: this.cells["G7"].value, isBold: false, id: "G7"},
      {editable: true, value: this.cells["H7"].value, isBold: false, id: "H7"},
      {
        editable: false,
        value: this.get("H7") <= 137
          ? "Норма"
          : this.get("H7") <= 164
            ? "Умеренно увеличен"
            : this.get("H7") <= 211
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "I7"
      },
      {editable: true, value: this.cells["J7"].value, isBold: false, id: "J7"},
      {editable: true, value: this.cells["K7"].value, isBold: false, id: "K7"},
      {
        editable: false,
        value: this.get("K7") <= 137
          ? "Норма"
          : this.get("K7") <= 164
            ? "Умеренно увеличен"
            : this.get("K7") <= 211
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "L7",
      },
      {editable: false, value: m7Value, isBold: false, id: "M7"},
    ]
  }

  private get row4(): Row {
    return [
      {editable: false, value: "Резистивное сопротивление на частоте 20 Гц (Rrs20)", isBold: true, id: "F8"},
      {editable: true, value: this.cells["G8"].value, isBold: false, id: "G8"},
      {editable: true, value: this.cells["H8"].value, isBold: false, id: "H8"},
      {
        editable: false,
        value: this.get("H8") <= 136
          ? "Норма"
          : this.get("H8") <= 167
            ? "Умеренно увеличен"
            : this.get("H8") <= 220
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "I8",
      },
      {editable: true, value: this.cells["J8"].value, isBold: false, id: "J8"},
      {editable: true, value: this.cells["K8"].value, isBold: false, id: "K8"},
      {
        editable: false,
        value: this.get("K8") <= 136
          ? "Норма"
          : this.get("K8") <= 167
            ? "Умеренно увеличен"
            : this.get("K8") <= 220
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "L8",
      },
      {editable: false, value: "", isBold: false, id: "M8"},
    ]
  }

  private get row5(): Row {
    const h9 = this.get("G7") - this.get("G8");
    const k9 = this.get("J7") - this.get("J8");

    runInAction(() => {
      this.h9 = h9;
      this.k9 = k9;
      this.m9 = k9 - h9;
    })

    return [
      {editable: false, value: "Абсолютная частотная зависимость", isBold: true, id: "F9"},
      {editable: false, value: "", isBold: false, id: "G9"},
      {editable: false, value: roundNumber(h9, this.toFixedValue), isBold: false, id: "H9"},
      {
        editable: false,
        value: this.h9 <= 0.09
          ? "Норма"
          : this.h9 <= 0.17
            ? "Умеренно увеличена"
            : this.h9 <= 0.32
              ? "Значительно увеличена"
              : "Резко увеличена",
        isBold: false,
        id: "I9",
      },
      {editable: false, value: "", isBold: false, id: "J9"},
      {editable: false, value: roundNumber(k9, this.toFixedValue), isBold: false, id: "K9"},
      {
        editable: false,
        value: this.k9 <= 0.09
          ? "Норма"
          : this.k9 <= 0.17
            ? "Умеренно увеличена"
            : this.k9 <= 0.32
              ? "Значительно увеличена"
              : "Резко увеличена",
        isBold: false,
        id: "L9",
      },
      {editable: false, value: roundNumber(this.k9 - this.h9, this.toFixedValue), isBold: false, id: "M9"},
    ]
  }

  private get row6(): Row {
    return [
      {editable: false, value: "Реактивное сопротивление на частоте 5 Гц (X5)", isBold: true, id: "F10"},
      {editable: false, value: "", isBold: false, id: "G10"},
      {editable: true, value: this.cells["H10"].value, isBold: false, id: "H10"},
      {
        editable: false,
        value: this.get("H10") >= -0.15
          ? "Норма"
          : this.get("H10") >= -0.27
            ? "Умеренно снижено"
            : this.get("H10") >= -0.47
              ? "Значительно снижено" 
              : "Резко снижено",
        isBold: false,
        id: "I10",
      },
      {editable: false, value: "", isBold: false, id: "J10"},
      {editable: true, value: this.cells["K10"].value, isBold: false, id: "K10"},
      {
        editable: false,
        value: this.get("K10") >= -0.15
          ? "Норма"
          : this.get("K10") >= -0.27
            ? "Умеренно снижено"
            : this.get("K10") >= -0.47
              ? "Значительно снижено"
              : "Резко снижено",
        isBold: false,
        id: "L10",
      },
      {editable: false, value: "", isBold: false, id: "M10"},
    ]
  }

  private get row7(): Row {
    return [
      {editable: false, value: "Сдвиг реактивного сопротивления от должной величины на частоте 5 Гц", isBold: true, id: "F11"},
      {editable: false, value: "", isBold: false, id: "G11"},
      {editable: true, value: this.cells["H11"].value, isBold: false, id: "H11"},
      {
        editable: false,
        value: this.get("H11") <= 0.16
          ? "Норма"
          : this.get("H11") <= 0.27
            ? "Умеренно увеличен"
            : this.get("H11") <= 0.46
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "I11",
      },
      {editable: false, value: "", isBold: false, id: "J11"},
      {editable: true, value: this.cells["K11"].value, isBold: false, id: "K11"},
      {
        editable: false,
        value: this.get("K11") <= 0.16
          ? "Норма"
          : this.get("K11") <= 0.27
            ? "Умеренно увеличен"
            : this.get("K11") <= 0.46
              ? "Значительно увеличен"
              : "Резко увеличен",
        isBold: false,
        id: "L11",
      },
      {editable: false, value: "", isBold: false, id: "M11"},
    ]
  }

  private get row8(): Row {
    
    const h12Value = this.get("H12");
    let m12Value: string;
    if (h12Value === 0) {
      m12Value = "#DIV/0!";
    } else {
      m12Value = roundNumber(((this.get("K12") - h12Value) / h12Value) * 100, this.toFixedValue);
      
      runInAction(() => {
        this.m12 = ((this.get("K12") - h12Value) / h12Value) * 100;
      })
    }

    return [
      {editable: false, value: "Резонансная частота (Fres)", isBold: true, id: "F12"},
      {editable: false, value: "", isBold: false, id: "G12"},
      {editable: true, value: this.cells["H12"].value, isBold: false, id: "H12"},
      {
        editable: false,
        value: this.get("H12") <= 15
          ? "Норма"
          : this.get("H12") <= 21
            ? "Умеренно увеличена"
            : this.get("H12") <= 32
              ? "Значительно увеличена"
              : "Резко увеличена",
        isBold: false,
        id: "I12",
      },
      {editable: false, value: "", isBold: false, id: "J12"},
      {editable: true, value: this.cells["K12"].value, isBold: false, id: "K12"},
      {
        editable: false,
        value: this.get("K12") <= 15
          ? "Норма"
          : this.get("K12") <= 21
            ? "Умеренно увеличена"
            : this.get("K12") <= 32
              ? "Значительно увеличена"
              : "Резко увеличена",
        isBold: false,
        id: "L12",
      },
      {editable: false, value: m12Value, isBold: false, id: "M12"},
    ]
  }

  private get row9(): Row {

    const h13Value = this.get("H13");
    let m13Value: string;
    if (h13Value === 0) {
      m13Value = "#DIV/0!";
    } else {
      m13Value = roundNumber(((this.get("K13") - h13Value) / h13Value) * 100, this.toFixedValue);
      
      runInAction(() => {
        this.m13 = ((this.get("K13") - h13Value) / h13Value) * 100;
      })
    }

    return [
      {editable: false, value: "Площадь под кривой реактивного сопротивления", isBold: true, id: "F13"},
      {editable: false, value: "", isBold: false, id: "G13"},
      {editable: true, value: this.cells["H13"].value, isBold: false, id: "H13"},
      {editable: false, value: "", isBold: false, id: "I13",},
      {editable: false, value: "", isBold: false, id: "J13"},
      {editable: true, value: this.cells["K13"].value, isBold: false, id: "K13"},
      {editable: false, value: "", isBold: false, id: "L13",},
      {editable: false, value: m13Value, isBold: false, id: "M13"},
    ]
  }

  get table(): tableCell[][] {
    return [this.row1, this.row2, this.row3, this.row4, this.row5, this.row6, this.row7, this.row8, this.row9];
  }

  private get conclusion1(): string {
    if (this.h9 >= 0.09) {
      return "Выявлены признаки обструкции периферических дыхательных путей";
    } else {
      return "Признаков обструкции периферических дыхательных путей не выявлено";
    }
  }

  private get conclusion2(): string {
    if (this.h9 < 0.09 && this.get("H7") >= 137 && this.get("H8") >= 136) {
      return "Выявлены признаки обструкции центральных дыхательных путей";
    } else {
      return "Признаков обструкции центральных отделов дыхательных путей не выявлено";
    }
  }

  private get conclusion3(): string {
    if (this.h9 >= 0.09 && this.get("H7") >= 137 && this.get("H8") >= 136) {
      return "Выявлены признаки генерализованной обструкции дыхательных путей";
    } else {
      return "Признаков генерализованной обструкции дыхательных путей не выявлено";
    }
  }

  private get conclusion4(): string {
    if (this.get("H7") < 137 && this.get("H12") >= 15 && this.get("H10") <= -0.15) {
      return "Нельзя исключить наличие рестриктивных нарушений";
    } else {
      return "Признаков рестриктивных нарушений не выявлено";
    }
  }

  private get conclusion5(): string {
    if (this.k9 >= 0.09) {
      return "Выявлены признаки обструкции периферических дыхательных путей";
    } else {
      return "Признаков обструкции периферических дыхательных путей не выявлено";
    }
  }

  private get conclusion6(): string {
    if (this.k9 < 0.09 && this.get("K7") >= 137 && this.get("K8") >= 136) {
      return "Выявлены признаки обструкции центральных дыхательных путей";
    } else {
      return "Признаков обструкции центральных отделов дыхательных путей не выявлено";
    }
  }

  private get conclusion7(): string {
    if (this.k9 >= 0.09 && this.get("K7") >= 137 && this.get("K8") >= 136) {
      return "Выявлены признаки генерализованной обструкции дыхательных путей";
    } else {
      return "Признаков генерализованной обструкции дыхательных путей не выявлено";
    }
  }

  private get conclusion8(): string {
    if (this.get("K7") < 137 && this.get("K12") >= 15 && this.get("K10") <= -0.15) {
      return "Нельзя исключить наличие рестриктивных нарушений";
    } else {
      return "Признаков рестриктивных нарушений не выявлено";
    }
  }

  public get conclusion9(): string {
    const M7 = this.m7
    const M9 = this.m9
    const M12 = this.m12
    const M13 = this.m13

    // Проверка для "положительная"
    if (M7 < -20 && M13 < -40) {
      return "Проба с бронхолитиком положительная";
    } 
    // Проверка для "сомнительная" (выполняется, если первое условие не истинно)
    else if (M7 < -20 || M9 > 0.04 || M12 < -20 || M13 < -40) {
      return "Проба с бронхолитиком сомнительная";
    } 
    // Если ни одно из вышеперечисленных условий не истинно
    else {
      return "Проба с бронхолитиком отрицательная";
    }
  }

  get conclusions(): string[] {
    return [
      this.conclusion1,
      this.conclusion2,
      this.conclusion3,
      this.conclusion4,
      this.conclusion5,
      this.conclusion6,
      this.conclusion7,
      this.conclusion8,
      this.conclusion9
    ];
  }

  async fetchPatientList(): Promise<{id: string, reportName: string}[]> {
    const result = await ApiHandler.fetchPatientList();
    runInAction(() => this.patientList = result);
    return result;
  }

  async fetchPatient(id: string) {
    if (this.patientsCache[id]) {
      runInAction(() => {
        this.patient = this.patientsCache[id];
        this.cells = this.patientsCache[id].cells;
        this.doctorName = this.patientsCache[id].doctorName;
        this.updateActiveScreen(id);
      })
      return;
    }

    const result = await ApiHandler.fetchPatient(id);
    runInAction(() => {
      this.patient = result;
      this.cells = result.cells;
      this.doctorName = result.doctorName;

      this.screens[id] = { id: id, name: result.reportName };
      this.updateActiveScreen(id);
    })

    requestAnimationFrame(() => {
      runInAction(() => {
        this.pdfConclusion1 = result.pdfConclusion1;
        this.pdfConclusion2 = result.pdfConclusion2;
      })
    })

    runInAction(() => {
      this.patientsCache[id] = result;
    })
  }

  async savePatient(): Promise<void> {
    const data: PatientServerData = {
      id: this.activeScreenId,
      name: this.patient.name,
      cells: this.cells,
      date: this.patient.date,
      weight: this.patient.weight,
      height: this.patient.height,
      age: this.patient.age,
      sex: this.patient.sex,
      pdfConclusion1: this.pdfConclusion1,
      pdfConclusion2: this.pdfConclusion2,
      doctorName: this.doctorName,
      reportName: this.screens[this.activeScreenId].name
    }
    await ApiHandler.savePatient(data);
    this.fetchPatientList();
  }

  async deletePatient(id: string): Promise<void> {
    const ok = confirm("Вы действительно хотите удалить данные о пациенте?");
    if (!ok) return;
    await ApiHandler.deletePatient(id);
    this.fetchPatientList();
  }

  async clearPatients(): Promise<void> {
    const ok = confirm("Вы действительно хотите удалить все данные о пациентах?");
    if (!ok) return;
    await ApiHandler.clearPatients();
    this.fetchPatientList();
  }
}

export default new Store();

export function parseLocalizedNumber(value: string | number): number {
  if (typeof value === 'number') {
    return value; // Already a number, no need to parse
  }

  if (typeof value !== 'string') {
    return 0; // Handle other unexpected types gracefully
  }

  // Replace comma with a dot for decimal conversion
  const normalizedValue = value.replace(',', '.');

  const numValue = Number(normalizedValue);

  // Return the number if valid, otherwise return 0
  return Number.isNaN(numValue) ? 0 : numValue;
}

const roundNumber = (n: number, precision: number): string => (Math.round(n * 10 ** precision) / 10 ** precision).toFixed(precision).replace('.', ',');

class ApiHandler {

  static async fetchPatientList(): Promise<{id: string, reportName: string}[]> {
    let result: {id: string, reportName: string}[] = [];
    
    await makeFetch(
      "/api/patients",
      {},
      (data: {id: string, reportName: string}[]) => {
        result = data;
      },
      (error: any) => {
        console.error(error);
      },
      "получить список отчётов"
    );

    return result;
  }

  static async fetchPatient(id: string): Promise<PatientServerData> {
    let result: PatientServerData = { id: "", name: "", cells: mockCells, date: "", weight: 0, height: 0, age: 0, sex: "", pdfConclusion1: "", pdfConclusion2: "", doctorName: "", reportName: "" };
    await makeFetch(
      `/api/patients/${id}`,
      {},
      (data: PatientServerData) => {
        result = data;
      },
      (error: any) => {
        console.error(error);
      },
      "получить данные о пациенте"
    );

    return result;
  }

  static async savePatient(data: PatientServerData): Promise<void> {
    await makeFetch(
      `/api/patients/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      () => {},
      (error: any) => {
        console.error(error);
      },
      "сохранить данные о пациенте",
      true
    );
  }

  static async deletePatient(id: string): Promise<void> {
    await makeFetch(
      `/api/patients/${id}`,
      {
        method: "DELETE",
      },
      () => {},
      (error: any) => {
        console.error(error);
      },
      "удалить данные о пациенте"
    );
  }

  static async clearPatients(): Promise<void> {
    await makeFetch(
      `/api/clear_patients/`,
      {
        method: "DELETE",
      },
      () => {},
      (error: any) => {
        console.error(error);
      },
      "удалить все данные о пациентах"
    );
  }
}

interface PatientServerData {
  id: string;        // Уникальный ID пациента
  name: string;      // Имя пациента (для отображения в списке)
  cells: Record<EditableCellId, editableCell>; // Данные редактируемых ячеек таблицы
  date: string;       // Дата рождения
  weight: number;     // Вес
  height: number;     // Рост
  age: number;        // Возраст
  sex: string;        // Пол
  pdfConclusion1: string; // Текст первого заключения для PDF
  pdfConclusion2: string; // Текст второго заключения для PDF
  doctorName: string; // Имя врача
  reportName: string; // Название отчёта
}
