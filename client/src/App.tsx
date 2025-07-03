import { observer } from "mobx-react-lite";
import type { tableCell } from "./store";
import store from "./store";
import { useEffect, useRef, useState } from "react";
import { handleGeneratePdf } from "./generatePdf";
import { FixedSizeList } from "react-window"; 
import Fish from "./Fish";

const App = observer(() => {
  
  useEffect(() => {
    store.fetchPatientList();
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const confirmationMessage = 'У вас могут быть несохраненные данные. Вы уверены, что хотите покинуть страницу?';

      (event as any).returnValue = confirmationMessage; 
      return confirmationMessage; 
    };

    window.addEventListener("keydown", store.handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener("keydown", store.handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [])

  return (
    <div className="container">
      <div className="top-panel">
        <div className={"screen-header screen-header_main" + (store.activeScreenId === "main" ? " screen-header_active" : "")} onClick={() => store.updateActiveScreen("main")}>Главное меню</div>
        {Object.values(store.screens).map((screen) => (
          <div className={"screen-header" + (store.activeScreenId === screen.id ? " screen-header_active" : "")} key={screen.id} onClick={() => store.updateActiveScreen(screen.id)}>
            <div className="screen-header__name">{screen.name}</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                store.deleteScreen(screen.id);
              }}
              title="Закрыть отчёт (не забудьте сохранить данные)"
            >⨉</button>
          </div>
        ))}
      </div>
      {
        store.activeScreenId === "main" ? <MainScreen /> : <EditorScreen />
      }
      <Fish />
    </div>
  )
})

const MainScreen = observer(() => {
  const [search, setSearch] = useState<string>("");

  // Filter the patient list based on the search input
  const filteredPatients = store.patientList.filter((patient) =>
    patient.reportName.toLowerCase().includes(search.toLowerCase())
  );

  // Define the row renderer for FixedSizeList
  const Row = ({ index, style}: { index: number; style: React.CSSProperties }) => {
    const patient = filteredPatients[index];
    if (!patient) return null; // Handle cases where patient might not be found (e.g., during rapid filtering)

    return (
      <div key={patient.id} className="patient-list__item" style={style}>
        <div
          className="patient-list__item-content patient-list__item-name"
          onClick={() => store.fetchPatient(patient.id)}
        >
          {patient.reportName}
        </div>
        <button
          className="patient-list__item-content"
          title="Удалить отчёт на сервере"
          onClick={() => store.deletePatient(patient.id)}
        >
          ⨉
        </button>
      </div>
    );
  };

  return (
    <div className="main-screen screen">
      <ToFixed />
      <p className="tip">ctrl + z - отменить последнее действие в таблице</p>
      <p className="tip">ctrl + y - восстановить отмененное действие в таблице</p>
      <p className="tip">ctrl + s - сохранить отчёт на сервере</p>
      <button className="download" onClick={() => store.createNewPatient()}>
        Создать отчёт для нового пациента
      </button>

      <div
        className="patient-list"
        style={{ display: store.patientList.length > 0 ? "block" : "none" }}
      >
        <div className="patient-list__title"> Список отчётов на сервере:</div>
        <div className="patient-list__search-container">
          <div className="patient-list__search-label">Поиск:</div>
          <input
            className="patient-list__search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="patient-list__item-content"
            title="Очистить поиск"
            onClick={() => setSearch("")}
          >
            ⨉
          </button>
        </div>

        <div className="patient-list__list">
          {filteredPatients.length > 0 ? (
            <FixedSizeList
              height={500} 
              itemCount={filteredPatients.length}
              itemSize={40} 
              width="100%" 
            >
              {Row}
            </FixedSizeList>
          ) : (
            <p>Нет отчетов для отображения.</p>
          )}
        </div>
      </div>
      <button className="download" onClick={store.clearPatients}>Удалить всех пациентов</button>
    </div>
  );
});

const EditorScreen = observer(() => {
  return (
    <div className="editor-screen screen">
      <ReprotName id={store.activeScreenId} />
      <DoctorName />
      <PatientData />
      <Table />
      <Conclusions />
      <button className="download" onClick={handleGeneratePdf}>Скачать отчёт</button>
      <button className="download" onClick={store.savePatient}>Сохранить отчёт на сервер</button>
    </div>
  )
})

const ReprotName = observer(({id} : {id: string}) => {
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    if (ref.current) {
      ref.current.select();
    }
  }

  return (
    <div style={{marginTop: "20px", }}>
      <PatientDataItem label="Название отчёта">
        <input id="fileName" onFocus={handleFocus} ref={ref}  type="text" value={store.screens[id]?.name || ""} onChange={(e) => store.updateScreenName(id, e.target.value)} />
      </PatientDataItem>
    </div>
  )
})

const DoctorName = observer(() => {
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    if (ref.current) {
      ref.current.select();
    }
  }

  return (
    <PatientDataItem label="Врач">
      <input id="doctorName" onFocus={handleFocus} ref={ref} className="patient-data__name-input" type="text" value={store.doctorName} onChange={(e) => store.updateDoctorName(e.target.value)} />
    </PatientDataItem>
  )
})

const ToFixed = observer(() => {
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    if (ref.current) {
      ref.current.select();
    }
  }

  return (
    <div className="to-fixed">
      <label className="to-fixed__label" htmlFor="toFixed">Количество знаков после запятой:</label>
      <input id="toFixed" onFocus={handleFocus} ref={ref} className="to-fixed__input" min={0} max={10} type="number" value={store.toFixedValue} onChange={(e) => store.updateToFixedValue(Number(e.target.value))} placeholder="toFixed" />
    </div>
  )
})

const PatientData = observer(() => {
  const { name, age, sex, height, weight, date } = store.patient;

  const handleInputFocus = (id: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;
    input.select();
  }

  return (
    <div className="patient-data">
      <div className="patient-data__title">Данные о пациенте</div>
      <PatientDataItem label="Имя">
        <input className="patient-data__name-input" id="name" type="text" value={name} onChange={(e) => store.updatePatientName(e.target.value)} onFocus={() => handleInputFocus("name")} />
      </PatientDataItem>
      <PatientDataItem label="Возраст">
        <input min={0} id="age" type="number" value={age} onChange={(e) => store.updatePatientAge(Number(e.target.value))} onFocus={() => handleInputFocus("age")} />
      </PatientDataItem>
      <PatientDataItem label="Пол">
        <select value={sex} onChange={(e) => store.updatePatientSex(e.target.value)}>
          <option value="Мужской">Мужской</option>
          <option value="Женский">Женский</option>
        </select>
      </PatientDataItem>
      <PatientDataItem label="Рост (см)">
        <input min={0} id="height" type="number" value={height} onChange={(e) => store.updatePatientHeight(Number(e.target.value))} onFocus={() => handleInputFocus("height")} />
      </PatientDataItem>
      <PatientDataItem label="Вес (кг)">
        <input min={0} id="weight" type="number" value={weight} onChange={(e) => store.updatePatientWeight(Number(e.target.value))} onFocus={() => handleInputFocus("weight")} />
      </PatientDataItem>
      <PatientDataItem label="Дата обследования">
        <input id="date" type="date" value={date} onChange={(e) => store.updatePatientDate(e.target.value)} />
      </PatientDataItem>
    </div>
  )
})

const PatientDataItem = ({children, label} : {children: React.ReactNode, label: string}) => {
  return (
    <div className="patient-data__item">
      <div className="patient-data__label">{label}</div>
      {children}
    </div>
  )
}

const Conclusions = observer(() => {
  return (
    <div className="conclusions">
      <div className="conclusions__title">Заключение</div>
      <div className="conclusions__subtitle">До пробы с бронхолитиком:</div>
      <Conclusion arr={store.conclusions.slice(0, 4)} number={1} />
      <div className="conclusions__subtitle">После пробы с бронхолитиком:</div>
      <Conclusion arr={store.conclusions.slice(4)} number={2} />
    </div>
  )
})

const Conclusion = observer(({ arr, number }: { arr: string[], number: 1 | 2 }) => {
  const initialValue = arr.join('\n');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    store.updatePdfConclusion(initialValue, number);
    requestAnimationFrame(autoResizeTextarea);
  }, []);

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleReset = () => {
    store.updatePdfConclusion(initialValue, number);
    requestAnimationFrame(() => {
      autoResizeTextarea();
    })
  }

  return (
    <div className="conclusions__conclusion-container">
      <textarea
        name="conclusions"
        ref={textareaRef} 
        value={number === 1 ? store.pdfConclusion1 : store.pdfConclusion2}
        onChange={(e) => {
          autoResizeTextarea();
          store.updatePdfConclusion(e.target.value, number);
        }}
        className="conclusions__textarea"
        id="conclusion-textarea" 
        rows={1} 
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}
      />
      <button onClick={handleReset} className="conclusions__reset">Сбросить до исходного состояния</button>
    </div>
  );
});

const Table: React.FC = observer(() => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {store.row1.map((cell) => (
              <TableCell key={cell.id} cell={cell} />
            ))}
          </tr>
        </thead>
        <tbody>
          {store.table.slice(1).map((row, rowIndex) => ( 
            <tr key={`row-${rowIndex}`}>
              {row.map((cell) => (
                <TableCell key={cell.id} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const TableCell = observer(({ cell }: { cell: tableCell }) => {
  const [active, setActive] = useState<boolean>(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.set(cell.id as typeof store.cells.G6.id, e.target.value);
  };

  const cellClasses = ['table-cell'];
  if (cell.isBold) {
    cellClasses.push('table-cell--bold');
  }
  if (!cell.editable && !cell.isBold) {
    cellClasses.push('table-cell--non-editable');
  }
  if (active) {
    cellClasses.push('table-cell--active');
  }

  const handleBlur = () => {
    setActive(false);
  }

  const handleClick = () => {
    if (!cell.editable) return;
    setActive(true);
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.select();
      }
    });
  }

  return (
    <td className={cellClasses.join(' ')} onClick={handleClick} onBlur={handleBlur}>
      <span className="table-cell__value" style={{ display: !active ? 'block' : 'none' }}>{cell.value}</span>
      <input
        type="text"
        style={{
          display: cell.editable && active ? 'block' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        ref={ref}
        value={cell.value}
        onChange={handleChange}
        className="table-cell__input"
      />
    </td>
  );
});

export default App;
