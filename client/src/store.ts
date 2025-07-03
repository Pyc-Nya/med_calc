import { makeAutoObservable, runInAction } from "mobx";


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

type Row = [tableCell, tableCell, tableCell, tableCell, tableCell, tableCell, tableCell, tableCell];
interface command {
  undo: () => void,
  redo: () => void
}

class Store {
  toFixedValue = 2;
  pdfConclusion1 = "";
  pdfConclusion2 = "";
  patient: patientData = {name: "", age: 0, sex: "", height: 0, weight: 0, date: ""};
  private h9 = 0;
  private k9 = 0;
  private undoStack: command[] = [];
  private redoStack: command[] = [];
  cells: Record<EditableCellId, editableCell> = {
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
  };

  constructor() {
    makeAutoObservable(this);
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
      localStorage.setItem(id, value);
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

  updatePatientName (name: string) { this.patient.name = name; }
  updatePatientAge (age: number) { this.patient.age = age; }
  updatePatientSex (sex: string) { this.patient.sex = sex; }
  updatePatientHeight (height: number) { this.patient.height = height; }
  updatePatientWeight (weight: number) { this.patient.weight = weight; }
  updatePatientDate (date: string) { this.patient.date = date; }

  unpackLS () {
    for (const id of EDITABLE_CELL_IDS) {
      const value = localStorage.getItem(id);
      if (value) {
        this.cells[id].value = value;
      }
    }
  }

  updateToFixedValue() {
    this.toFixedValue = 2;
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
      if (!commandToUndo) return;
      commandToUndo.undo();
      this.redoStack.push(commandToUndo);
    } else if (keyCode === "KeyY") {
      const commandToRedo = this.redoStack.pop();
      if (!commandToRedo) return;
      commandToRedo.redo();
      this.undoStack.push(commandToRedo);
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
      {editable: false, value: "", isBold: true, id: "M6"},
    ]
  }

  private get row3(): Row {

    const g7Value = this.get("G7");
    let m7Value: string;
    if (g7Value === 0) {
      m7Value = "#DIV/0!";
    } else {
      m7Value = roundNumber(((this.get("J7") - g7Value) / g7Value) * 100, this.toFixedValue);
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
    ];
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
