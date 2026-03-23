// Work centers with descriptions and department assignments for different traveler types

export interface WorkCenterItem {
  name: string;
  description: string;
  code?: string;
  department?: string;
  departments?: string[];
}

// PCB Assembly work centers with descriptions and departments (46 steps)
export const PCB_ASSEMBLY_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'ENGINEERING', description: 'Reverse engineering and design', department: 'Engineering/Prep' },
  { name: 'GENERATE CAD', description: 'Generate CAD design files', department: 'Engineering/Prep' },
  { name: 'VERIFY BOM', description: 'Verify no BOM or rev changes', department: 'Engineering/Prep' },
  { name: 'GENERATE GERBER', description: 'Generate Gerber files for PCB fabrication', department: 'Engineering/Prep' },
  { name: 'VERIFY GERBER', description: 'Verify Gerber files for accuracy', department: 'Engineering/Prep' },
  { name: 'MAKE SILKSCREEN', description: 'Create silkscreen layer for component identification', department: 'Engineering/Prep' },
  { name: 'CREATE BOM', description: 'Create Bill of Materials for the assembly', department: 'Engineering/Prep' },
  { name: 'KITTING', description: 'Pull parts from inventory to place in a kit for manufacturing', department: 'Receiving' },
  { name: 'COMPONENT PREP', description: 'Pre-bending of parts or any necessary alteration of a part prior to production', department: 'TH' },
  { name: 'PROGRAM PART', description: 'Parts that need to be programmed prior to SMT', department: 'Test/Soldering' },
  { name: 'HAND SOLDER', description: 'Anything that must be soldered by hand, no wave, no SMT', department: 'Soldering' },
  { name: 'SMT PROGRAMING', description: 'Programming the SMT placement machine', department: 'SMT' },
  { name: 'FEEDER LOAD', description: 'The time it takes to load all needed parts onto feeders/Matrix trays', department: 'SMT' },
  { name: 'SMT SET UP', description: 'The time it takes to align parts/make needed changes to programs', department: 'SMT' },
  { name: 'GLUE', description: 'Gluing done at SMT after paste to make sure parts stay on', department: 'SMT' },
  { name: 'SMT TOP', description: 'SMT top placed', department: 'SMT' },
  { name: 'SMT BOTTOM', description: 'SMT bottom placed', department: 'SMT' },
  { name: 'WASH', description: 'Process of cleaning a dirty PCB', department: 'ALL' },
  { name: 'X-RAY', description: 'Visual continuity check of components as requested by customer', department: 'SMT/Soldering/Test' },
  { name: 'MANUAL INSERTION', description: 'Install prepared parts before wave', department: 'TH' },
  { name: 'WAVE', description: 'Wave soldering process', department: 'TH' },
  { name: 'WASH', description: 'Post-wave cleaning process', department: 'ALL' },
  { name: 'CLEAN TEST', description: 'Use the ion tester to check cleanliness', department: 'ALL' },
  { name: 'TRIM', description: 'Cut excess leads on backside', department: 'TH/Soldering' },
  { name: 'PRESS FIT', description: 'Use pressure to insert a part on the PCB', department: 'Soldering' },
  { name: 'HAND ASSEMBLY', description: 'Assembly of parts after wave but before inspection', department: 'TH' },
  { name: 'AOI PROGRAMMING', description: 'Programming the AOI machine (first time build or new part/PCB change revision)', department: 'Quality' },
  { name: 'AOI', description: 'Automated Optical Inspection of the PCB', department: 'Quality' },
  { name: 'SECONDARY ASSEMBLY', description: 'Anything assembled after ESS testing or inspection', department: 'Soldering' },
  { name: 'EPOXY', description: 'Anything that needs to be glued or epoxied', department: 'ALL' },
  { name: 'INTERNAL TESTING', description: 'In house test at ACI', department: 'Test' },
  { name: 'LABELING', description: 'Place a label on the board per BOM instructions', department: 'Shipping' },
  { name: 'DEPANEL', description: 'Break panel into individual boards', department: 'Shipping' },
  { name: 'PRODUCT PICTURES', description: 'Take pictures of product before shipping to ESS, Parylene, or customer', department: 'Quality/Shipping/Test' },
  { name: 'SEND TO EXTERNAL COATING', description: 'Operator to sign and ship to coating', department: 'Shipping' },
  { name: 'RETURN FROM EXTERNAL COATING', description: 'Operator to sign when received from coating', department: 'Receiving/Test' },
  { name: 'INTERNAL COATING', description: 'In house coating at ACI', department: 'Coating' },
  { name: 'INTERNAL TESTING', description: 'Post-coating in house test at ACI', department: 'Test' },
  { name: 'SEND TO ESS', description: 'Operator to sign and ship to ESS', department: 'Shipping' },
  { name: 'RETURN FROM ESS', description: 'Operator to sign when received from ESS', department: 'Receiving/Test' },
  { name: 'INTERNAL TESTING', description: 'Post-ESS in house test at ACI', department: 'Test' },
  { name: 'VISUAL INSPECTION', description: 'Human visual inspection parts and coating, no AOI', department: 'Quality' },
  { name: 'MANUAL ASSEMBLY', description: 'Put the assembly together by hand', department: 'Soldering/Cable' },
  { name: 'BOX ASSEMBLY', description: 'Mechanical build consisting of the PCBA, hardware, and/or housings', department: 'Soldering/Cable' },
  { name: 'HARDWARE', description: 'Adding screws, nuts, bolts, brackets, displays, etc. that need to be installed or individually packaged for shipment to customer', department: 'Soldering/Cable' },
  { name: 'FINAL INSPECTION', description: 'Final quality inspection before shipping', department: 'Quality' },
  { name: 'SHIPPING', description: 'Send product to customer per packing request', department: 'Shipping' },
];

// PCB work centers
export const PCB_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'VERIFY BOM', description: 'Verify no BOM or rev changes', department: 'Engineering/Prep' },
  { name: 'KITTING', description: 'Pull parts from inventory to place in a kit for manufacturing', department: 'Receiving' },
  { name: 'VISUAL INSPECTION', description: 'Human visual inspection parts and coating, no AOI', department: 'Quality' },
  { name: 'SHIPPING', description: 'Send product to customer per packing request', department: 'Shipping' },
  { name: 'JOB NUMBER', description: 'ACI job number' },
  { name: 'NUMBER OF LAYERS', description: 'Quantity of different board layers such as signal, power, ground layers, etc.' },
  { name: 'BOARD SIZE', description: 'Physical dimensions of the board' },
  { name: 'MATERIAL', description: 'The base material/foundation of the board' },
  { name: 'BOARD THICKNESS', description: 'Overall thickness of the printed circuit board' },
  { name: 'COPPER THICKNESS', description: 'Thickness of the conductive copper layer' },
  { name: 'GOLD', description: 'ENIG surface finish/plating' },
  { name: 'HAL/HASL/LF HASL', description: 'Surface finish/plating' },
  { name: 'GOLD FINGERS', description: 'Gold contacts on outer edge of board' },
  { name: 'CSINK', description: 'Countersink holes' },
  { name: 'BLIND & BURIED VIAS', description: 'Blind vias connect an internal layer to an external layer; buried vias connect internal layers to each other' },
  { name: 'GENERATE GERBER/PANELIZATION', description: 'Create a zip file for the PCB vendor that specifies the copper traces, solder mask, silkscreen, etc. along with a drill file and panelization', department: 'Engineering/Prep' },
  { name: 'ORDER/PURCHASE PCB', description: 'Name of the PCB vendor and quantity needed' },
  { name: 'RECEIVING', description: 'Receive parts from vendors and put into ACI inventory', department: 'Receiving' },
  { name: 'VSCORE', description: 'Use a machine to break a panel into individual boards' },
  { name: 'FINAL INSPECTION', description: 'Sample inspection of the PCB artwork by Quality Control', department: 'Quality' },
];

// Cables work centers
export const CABLES_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'VERIFY BOM', description: 'Verify no BOM or rev changes', department: 'Engineering/Prep' },
  { name: 'KITTING', description: 'Pull parts from inventory to place in a kit for manufacturing', department: 'Receiving' },
  { name: 'COMPONENT PREP', description: 'Pre-bending of parts or any necessary alteration of a part prior to production', department: 'TH' },
  { name: 'WIRE CUT', description: 'Cut wire to length needed', department: 'Cable' },
  { name: 'STRIP WIRE', description: 'Remove insulation to necessary length', department: 'Cable' },
  { name: 'TINNING', description: 'Dip wire end into solder', department: 'Cable' },
  { name: 'CRIMPING', description: 'Fold into ridges by pinching together', department: 'Cable' },
  { name: 'MANUAL INSERTION', description: 'Install prepared parts', department: 'TH' },
  { name: 'HAND SOLDER', description: 'Anything that must be soldered by hand, no wave, no SMT', department: 'Soldering' },
  { name: 'HAND ASSEMBLY', description: 'Assembly of parts after wave but before inspection', department: 'TH' },
  { name: 'SECONDARY ASSEMBLY', description: 'Anything assembled after testing or inspection', department: 'Soldering' },
  { name: 'EPOXY', description: 'Anything that needs to be glued or epoxied', department: 'ALL' },
  { name: 'MANUAL ASSEMBLY', description: 'Put the assembly together by hand', department: 'Soldering/Cable' },
  { name: 'HEAT SHRINK', description: 'Cut and shrink (heat shrink or flex loom)', department: 'Cable' },
  { name: 'BOX ASSEMBLY', description: 'Mechanical build consisting of the PCBA, hardware, and/or housings', department: 'Soldering/Cable' },
  { name: 'HARDWARE', description: 'Adding screws, nuts, bolts, brackets, displays, etc. that need to be installed or individually packaged for shipment to customer', department: 'Soldering/Cable' },
  { name: 'PULL TEST', description: 'Make sure crimps don\'t fall off', department: 'Cable' },
  { name: 'VISUAL INSPECTION', description: 'Human visual inspection parts and coating, no AOI', department: 'Quality' },
  { name: 'LABELING', description: 'Place a label per instructions', department: 'Shipping' },
  { name: 'PRODUCT PICTURES', description: 'Take pictures of product before shipping', department: 'Quality/Shipping/Test' },
  { name: 'SHIPPING', description: 'Send product to customer per packing request', department: 'Shipping' },
];

// Purchasing work centers
export const PURCHASING_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'ENGINEERING', description: 'Reverse engineering and design', department: 'Engineering/Prep' },
  { name: 'MAKE BOM', description: 'Create or update Bill of Materials', department: 'Engineering/Prep' },
  { name: 'PURCHASING', description: 'Procure parts in sufficient quantities for build at the lowest price' },
  { name: 'QUOTE', description: 'Estimation of material, labor, and PCB costs to build an assembly' },
  { name: 'INVENTORY', description: 'Add to inventory and track stock levels' },
];

// Department color mapping for consistent styling
export const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Engineering': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
  'Prep': { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-700' },
  'Engineering/Prep': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
  'Receiving': { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-700' },
  'TH': { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
  'Test': { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
  'Soldering': { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
  'SMT': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
  'ALL': { bg: 'bg-gray-50 dark:bg-slate-800', text: 'text-gray-700 dark:text-slate-300', border: 'border-gray-200 dark:border-slate-600' },
  'Quality': { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
  'Shipping': { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-700' },
  'Coating': { bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-700' },
  'Cable': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
  'Purchasing': { bg: 'bg-lime-50 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-700' },
  'Other': { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-600' },
};

// Department progress bar color mapping
export const DEPARTMENT_BAR_COLORS: Record<string, string> = {
  'Engineering': '#6366f1',
  'Prep': '#f43f5e',
  'Engineering/Prep': '#6366f1',
  'Receiving': '#06b6d4',
  'TH': '#a855f7',
  'Test': '#eab308',
  'Soldering': '#f97316',
  'SMT': '#3b82f6',
  'ALL': '#6b7280',
  'Quality': '#22c55e',
  'Shipping': '#14b8a6',
  'Coating': '#ec4899',
  'Cable': '#f59e0b',
  'Purchasing': '#84cc16',
  'Other': '#64748b',
};

// Known individual department names (NOT compound like Engineering/Prep — those get split)
const KNOWN_DEPARTMENTS = new Set([
  'Engineering', 'Prep', 'Receiving', 'TH', 'Test', 'Soldering', 'SMT',
  'ALL', 'Quality', 'Shipping', 'Coating', 'Cable', 'Purchasing', 'Other'
]);

// Helper to split slash-separated department strings into individual tags
export function parseDepartments(dept: string | undefined | null): string[] {
  if (!dept) return [];
  // If the whole string is a known department, return as-is
  if (KNOWN_DEPARTMENTS.has(dept)) return [dept];
  // Try splitting and check if all parts are known departments
  const parts = dept.split('/').map(d => d.trim()).filter(Boolean);
  const allKnown = parts.every(p => KNOWN_DEPARTMENTS.has(p));
  if (allKnown && parts.length > 1) return parts;
  // Fallback: return as-is
  return [dept];
}

// Helper to get color for a single department
export function getDepartmentColor(dept: string): { bg: string; text: string; border: string } {
  return DEPARTMENT_COLORS[dept] || DEPARTMENT_COLORS['Other'];
}

// Helper to get bar color for a single department
export function getDepartmentBarColor(dept: string): string {
  return DEPARTMENT_BAR_COLORS[dept] || DEPARTMENT_BAR_COLORS['Other'];
}

// Function to get work centers by traveler type
export const getWorkCentersByType = (type: string): WorkCenterItem[] => {
  switch (type) {
    case 'PCB_ASSEMBLY':
      return PCB_ASSEMBLY_WORK_CENTERS;
    case 'PCB':
      return PCB_WORK_CENTERS;
    case 'CABLES':
    case 'CABLE':
      return CABLES_WORK_CENTERS;
    case 'PURCHASING':
      return PURCHASING_WORK_CENTERS;
    default:
      return PCB_ASSEMBLY_WORK_CENTERS;
  }
};

// Legacy export for backward compatibility
export const WORK_CENTERS = PCB_ASSEMBLY_WORK_CENTERS.map(wc => wc.name);

export type WorkCenter = string;
