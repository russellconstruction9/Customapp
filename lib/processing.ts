import type { CalculationResults, CalculatorInputs, FoamType, AdditionalSection, InventoryLineItem } from '../components/SprayFoamCalculator.tsx';
import type { Costs, CustomerInfo } from '../components/EstimatePDF.tsx';
import { InventoryItem } from './db.ts';

// --- Helper Functions ---

function fmt(n: number, digits = 2) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function parseDegrees(input: string): number | null {
  const m = input.trim().match(/(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1]);
}

function parsePitchToRisePer12(input: string): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (s.includes("°") || s.includes("deg")) {
    const deg = parseDegrees(s);
    if (deg === null) return null;
    return Math.tan((deg * Math.PI) / 180);
  }
  const cleaned = s.replace(/\s*in\s*/g, "/").replace(/:/g, "/").replace(/-/g, "/").replace(/\s+/g, "");
  if (cleaned.includes("/")) {
    const [riseStr, runStr] = cleaned.split("/");
    const rise = parseFloat(riseStr);
    const run = runStr ? parseFloat(runStr) : 12;
    if (!isFinite(rise) || !isFinite(run) || run === 0) return null;
    return rise / run;
  }
  const riseOnly = parseFloat(cleaned);
  if (!isFinite(riseOnly)) return null;
  return riseOnly / 12;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// --- Core Calculation Logic ---

export function calculateResults(inputs: CalculatorInputs): Omit<CalculationResults, 'customer'> {
  const { 
    calculatorType, length, width, wallHeight, pitchInput, includeGableTriangles, 
    totalWallLength,
    wallFoamType, wallThicknessIn, wallWastePct, 
    roofFoamType, roofThicknessIn, roofWastePct, 
    openCellYield, closedCellYield,
    additionalSections, inventoryLineItems
  } = inputs;
  
  // Base variables
  let wallTotal = 0;
  let roofArea = 0;
  let pitchValid = true;
  let risePer12 = 0;
  let slopeFactor = 1;
  let perimeter = 0;
  let wallRectArea = 0;
  let gableAdd = 0;

  const additionalWallArea = (additionalSections || [])
    .filter(s => s.type === 'walls')
    .reduce((sum, s) => sum + (Number(s.length) * Number(s.width)), 0);
    
  const additionalRoofArea = (additionalSections || [])
    .filter(s => s.type === 'roof')
    .reduce((sum, s) => sum + (Number(s.length) * Number(s.width)), 0);

  if (calculatorType === 'building') {
    const L = Math.max(0, Number(length));
    const W = Math.max(0, Number(width));
    const H = Math.max(0, Number(wallHeight));
    const parsedRise = parsePitchToRisePer12(pitchInput ?? "");
    
    pitchValid = parsedRise !== null && isFinite(parsedRise) && parsedRise >= 0;
    risePer12 = parsedRise ?? NaN;
    slopeFactor = pitchValid ? Math.sqrt(1 + risePer12 * risePer12) : NaN;
    perimeter = 2 * (L + W);
    wallRectArea = perimeter * H;

    if (pitchValid && includeGableTriangles) {
        const riseCenter = (W / 2) * risePer12;
        gableAdd = W * riseCenter;
    }
    wallTotal = wallRectArea + gableAdd + additionalWallArea;
    roofArea = (pitchValid ? L * W * slopeFactor : 0) + additionalRoofArea;
  
  } else if (calculatorType === 'walls') {
    wallTotal = (Number(totalWallLength) * Number(wallHeight)) + additionalWallArea;
    roofArea = additionalRoofArea; // Roof area can still be added via custom sections
  
  } else if (calculatorType === 'flat-area') {
    wallTotal = additionalWallArea;
    roofArea = (Number(length) * Number(width)) + additionalRoofArea;
  
  } else if (calculatorType === 'custom') {
    wallTotal = additionalWallArea;
    roofArea = additionalRoofArea;
  }


  const totalSprayArea = wallTotal + roofArea;

  const wThick = clamp(Number(wallThicknessIn), 0, 1000);
  const wWaste = clamp(Number(wallWastePct), 0, 100);
  const rThick = clamp(Number(roofThicknessIn), 0, 1000);
  const rWaste = clamp(Number(roofWastePct), 0, 100);

  const wallBoardFeetBase = wallTotal * wThick;
  const roofBoardFeetBase = roofArea * rThick;
  const totalBoardFeetBase = wallBoardFeetBase + roofBoardFeetBase;

  const wallBoardFeetWithWaste = wallBoardFeetBase * (1 + wWaste / 100);
  const roofBoardFeetWithWaste = roofBoardFeetBase * (1 + rWaste / 100);
  const totalBoardFeetWithWaste = wallBoardFeetWithWaste + roofBoardFeetWithWaste;

  let totalOpenCellBoardFeet = 0;
  let totalClosedCellBoardFeet = 0;

  if (wallFoamType === 'open-cell') {
      totalOpenCellBoardFeet += wallBoardFeetWithWaste;
  } else {
      totalClosedCellBoardFeet += wallBoardFeetWithWaste;
  }
  if (roofFoamType === 'open-cell') {
      totalOpenCellBoardFeet += roofBoardFeetWithWaste;
  } else {
      totalClosedCellBoardFeet += roofBoardFeetWithWaste;
  }
  
  const ocYield = Math.max(1, Number(openCellYield));
  const ccYield = Math.max(1, Number(closedCellYield));
  const ocSets = isFinite(totalOpenCellBoardFeet) ? totalOpenCellBoardFeet / ocYield : NaN;
  const ccSets = isFinite(totalClosedCellBoardFeet) ? totalClosedCellBoardFeet / ccYield : NaN;

  return {
    pitchValid, risePer12, slopeFactor, perimeter,
    wallRectArea, gableAdd, wallTotal, roofArea, totalSprayArea, totalBoardFeetBase,
    wallBoardFeetWithWaste, roofBoardFeetWithWaste, totalBoardFeetWithWaste, wallFoamType,
    roofFoamType, wallThicknessIn: wThick, roofThicknessIn: rThick, ocSets, ccSets,
    totalOpenCellBoardFeet, totalClosedCellBoardFeet, inventoryLineItems,
  };
}

// --- Core Costing Logic ---

export interface CostSettings {
  ocCostPerSet: number;
  ocMarkup: number;
  ccCostPerSet: number;
  ccMarkup: number;
  laborRate: number;
  laborHours: number;
  equipmentFee: number;
  overheadPercentage: number;
  salesTax: number;
}

export const DEFAULT_COST_SETTINGS: CostSettings = {
  ocCostPerSet: 1000,
  ocMarkup: 20,
  ccCostPerSet: 1100,
  ccMarkup: 25,
  laborRate: 50,
  laborHours: 24,
  equipmentFee: 150,
  overheadPercentage: 10,
  salesTax: 0,
};

export function calculateCosts(
  calc: Omit<CalculationResults, 'customer'>, 
  settings: CostSettings, 
  lineItems: { id: number, description: string, cost: number }[] = [],
  inventoryItems: InventoryItem[]
): Costs {
  const {
    ocCostPerSet, ocMarkup, ccCostPerSet, ccMarkup,
    laborRate, laborHours, equipmentFee,
    overheadPercentage, salesTax
  } = settings;
  
  const ocMaterialSubtotal = (calc.ocSets || 0) * (Number(ocCostPerSet) || 0);
  const ocMarkupValue = ocMaterialSubtotal * ((Number(ocMarkup) || 0) / 100);
  const ocTotal = ocMaterialSubtotal + ocMarkupValue;

  const ccMaterialSubtotal = (calc.ccSets || 0) * (Number(ccCostPerSet) || 0);
  const ccMarkupValue = ccMaterialSubtotal * ((Number(ccMarkup) || 0) / 100);
  const ccTotal = ccMaterialSubtotal + ccMarkupValue;

  const totalMaterialCost = ocTotal + ccTotal;

  const laborCost = (Number(laborRate) || 0) * (Number(laborHours) || 0);
  const laborAndEquipmentCost = laborCost + (Number(equipmentFee) || 0);

  const additionalCostsTotal = lineItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const inventoryCostBreakdown = (calc.inventoryLineItems || [])
    .map(line => {
        const item = inventoryItems.find(i => i.id === line.itemId);
        if (!item) return null;
        const lineTotal = (item.unitCost || 0) * line.quantity;
        return { ...line, name: item.name, unitCost: item.unitCost || 0, lineTotal };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const totalInventoryCost = inventoryCostBreakdown.reduce((sum, item) => sum + item.lineTotal, 0);

  const subtotal = totalMaterialCost + laborAndEquipmentCost + additionalCostsTotal + totalInventoryCost;
  const overheadValue = subtotal * ((Number(overheadPercentage) || 0) / 100);
  const preTaxTotal = subtotal + overheadValue;
  const taxValue = preTaxTotal * ((Number(salesTax) || 0) / 100);
  const finalQuote = preTaxTotal + taxValue;

  return {
    ocSets: calc.ocSets, ocCostPerSet, ocMarkup, ocTotal,
    ccSets: calc.ccSets, ccCostPerSet, ccMarkup, ccTotal,
    totalMaterialCost, laborRate, laborHours, equipmentFee, laborAndEquipmentCost,
    lineItems, additionalCostsTotal,
    inventoryCostBreakdown, totalInventoryCost,
    subtotal, overheadValue, preTaxTotal, taxValue, finalQuote,
  };
}