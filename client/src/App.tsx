import { observer } from "mobx-react-lite";
import type { tableCell } from "./store";
import store from "./store";
import { useEffect, useRef, useState } from "react";
import { handleGeneratePdf } from "./generatePdf";

const App = () => {

  useEffect(() => {
    store.unpackLS();
    window.addEventListener("keydown", store.handleKeyDown);

    return () => {
      window.removeEventListener("keydown", store.handleKeyDown);
    }
  }, [])


  return (
    <div className="container">
      <div className="to-fixed">
        <label className="to-fixed__label" htmlFor="toFixed">Количество знаков после запятой:</label>
        <input className="to-fixed__input" min={0} max={10} type="number" value={store.toFixedValue} onChange={(e) => store.toFixedValue = Number(e.target.value)} placeholder="toFixed" />
      </div>
      <PatientData />
      <Table />
      <Conclusions />
      <button className="download" onClick={handleGeneratePdf}>Скачать отчёт</button>
    </div>
  )
}

const PatientData = observer(() => {
  const { name, age, sex, height, weight, date } = store.patient;

  return (
    <div className="patient-data">
      <div className="patient-data__title">Данные о пациенте</div>
      <PatientDataItem label="Имя">
        <input type="text" value={name} onChange={(e) => store.updatePatientName(e.target.value)} />
      </PatientDataItem>
      <PatientDataItem label="Возраст">
        <input type="number" value={age} onChange={(e) => store.updatePatientAge(Number(e.target.value))} />
      </PatientDataItem>
      <PatientDataItem label="Пол">
        <select value={sex} onChange={(e) => store.updatePatientSex(e.target.value)}>
          <option value="Мужской">Мужской</option>
          <option value="Женский">Женский</option>
        </select>
      </PatientDataItem>
      <PatientDataItem label="Рост">
        <input type="number" value={height} onChange={(e) => store.updatePatientHeight(Number(e.target.value))} />
      </PatientDataItem>
      <PatientDataItem label="Вес">
        <input type="number" value={weight} onChange={(e) => store.updatePatientWeight(Number(e.target.value))} />
      </PatientDataItem>
      <PatientDataItem label="Дата">
        <input type="date" value={date} onChange={(e) => store.updatePatientDate(e.target.value)} />
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
      <Conclusion arr={store.conclusions.slice(4, 8)} number={2} />
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
      <button onClick={() => store.updatePdfConclusion(initialValue, number)} className="conclusions__reset">Сбросить до исходного состояния</button>
    </div>
  );
});

const Table: React.FC = observer(() => {
  return (
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

  const onBlur = () => {
    setActive(false);
  }

  const onDoubleClick = () => {
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
    <td className={cellClasses.join(' ')} onDoubleClick={onDoubleClick} onBlur={onBlur}>
      <span className="table-cell__value" style={{ display: !active ? 'block' : 'none' }}>{cell.value}</span>
      <input
        type="text"
        style={{
          display: cell.editable && active ? 'block' : 'none',
        }}
        ref={ref}
        value={cell.value}
        onChange={handleChange}
        className="table-cell__input"
      />
    </td>
  );
});

export default observer(App);
