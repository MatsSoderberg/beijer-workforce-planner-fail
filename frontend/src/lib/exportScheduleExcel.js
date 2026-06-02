import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const BEIJER_YELLOW = "FFFED141";
const DARK = "FF2B2B2B";
const LIGHT_GREY = "FFD0D3D4";
const SOFT_GREY = "FFF7F7F7";

function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d - week1) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function codeToText(a) {
  if (!a) return "";
  if (a.code === "L") return "Ledig";
  if (a.start && a.end) return `${a.start}-${a.end}`;
  if (a.code === "T") return "Tidigt";
  if (a.code === "D") return "Dag";
  if (a.code === "K") return "Kväll";
  if (a.code === "H") return "Helg";
  return a.code;
}
function departmentColor(dept = "") {
  const d = dept.toLowerCase();

  if (d.includes("kassa")) return "FF6D5BA8";
  if (d.includes("färg")) return "FF2E8B57";
  if (d.includes("järn")) return "FFC98A2E";
  if (d.includes("lager")) return "FF4682B4";

  return "FF666666";
}

function shiftColor(code) {
  switch (code) {
    case "T":
      return "FFB8A63B";
    case "M":
      return "FF3F78B4";
    case "D":
      return "FF3F9B58";
    case "N":
      return "FF6F4BB8";
    case "K":
      return "FFA54B4B";
    case "H":
      return "FFD97E2F";
    case "L":
      return "FF888888";
    default:
      return "FF444444";
  }
}
function formatExcelDate(dateStr) {
  const date = new Date(dateStr);
  const days = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
  return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}
function groupByWeek(rows) {
  const weeks = {};

  rows[0]?.assignments?.forEach((a, index) => {
    const week = getWeekNumber(a.date);

    if (!weeks[week]) {
      weeks[week] = [];
    }

    weeks[week].push({
      index,
      date: a.date,
    });
  });

  return weeks;
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BEIJER_YELLOW },
    };

    cell.font = {
      bold: true,
      color: { argb: DARK },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  });
}

export async function exportScheduleToExcel(generated) {
  if (!generated?.rows?.length) return;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Beijer Workforce Planner";

  const overview = workbook.addWorksheet("Översikt");

  overview.columns = [
    { header: "Nyckeltal", width: 25 },
    { header: "Värde", width: 40 },
  ];

  overview.addRow([
    "Period",
    `${generated.metadata?.startDate || ""} - ${
      generated.metadata?.endDate || ""
    }`,
  ]);

  overview.addRow([
    "Antal medarbetare",
    generated.rows.length,
  ]);

  overview.addRow([
    "Preferenser",
    generated.metadata?.preferenceCount || 0,
  ]);

  styleHeader(overview.getRow(1));

  const weeks = groupByWeek(generated.rows);

  Object.entries(weeks).forEach(([weekNo, days]) => {
    const ws = workbook.addWorksheet(`Vecka ${weekNo}`);

    ws.columns = [
      { header: "Medarbetare", width: 22 },
      { header: "Avdelning", width: 16 },
      ...days.map((d) => ({
  header: formatExcelDate(d.date),
  width: 14,
})),
      { header: "Timmar", width: 10 },
    ];

generated.rows.forEach((row) => {
  const excelRow = ws.addRow([
    row.employeeName,
    row.department,
    ...days.map((d) =>
      codeToText(row.assignments[d.index])
    ),
   days.reduce((sum, d) => {
  const assignment = row.assignments[d.index];
  return sum + (assignment?.hours || 0);
}, 0),
  ]);

  excelRow.height = 24;

  excelRow.getCell(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  excelRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: departmentColor(row.department),
    },
  };

  excelRow.getCell(2).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  excelRow.getCell(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: departmentColor(row.department),
    },
  };

  days.forEach((d, idx) => {
    const assignment = row.assignments[d.index];
    const cell = excelRow.getCell(idx + 3);

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: shiftColor(assignment?.code),
      },
    };

    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  });

  const hourCell = excelRow.getCell(days.length + 3);

  hourCell.font = {
    bold: true,
  };

  hourCell.alignment = {
    horizontal: "center",
  };
});
    styleHeader(ws.getRow(1));

    ws.views = [
  {
    state: "frozen",
    ySplit: 1,
    xSplit: 2,
  },
];

ws.autoFilter = {
  from: "A1",
  to: ws.getRow(1).lastCell.address,
};

    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    };
  });

  const buffer =
    await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    "Beijer_Workforce_Planner_Schema.xlsx"
  );
}
