// Work centers with descriptions for different traveler types

export interface WorkCenterItem {
  name: string;
  description: string;
}

// PCB Assembly work centers with descriptions
export const PCB_ASSEMBLY_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'ENGINEERING', description: 'Reverse engineering and design' },
  { name: 'VERIFY BOM', description: 'Verify no BOM or rev changes' },
  { name: 'KITTING', description: 'Pull parts from inventory to place in a kit for manufacturing' },
  { name: 'COMPONENT PREP', description: 'Pre-bending of parts or any necessary alteration of a part prior to production' },
  { name: 'PROGRAM PART', description: 'Parts that need to be programmed prior to SMT' },
  { name: 'HAND SOLDER', description: 'Anything that must be soldered by hand, no wave, no SMT' },
  { name: 'SMT PROGRAMMING', description: 'Programming the SMT placement machine (first time build or new part/PCB change revision)' },
  { name: 'GLUE', description: 'Gluing done at SMT after paste to make sure parts stay on' },
  { name: 'SMT TOP', description: 'SMT top placed' },
  { name: 'SMT BOTTOM', description: 'SMT bottom placed' },
  { name: 'WASH', description: 'Process of cleaning a dirty PCB' },
  { name: 'X-RAY', description: 'Visual continuity check of components as requested by customer' },
  { name: 'MANUAL INSERTION', description: 'Install prepared parts before wave' },
  { name: 'WAVE', description: 'Wave soldering process' },
  { name: 'CLEAN TEST', description: 'Use the ion tester to check cleanliness' },
  { name: 'TRIM', description: 'Cut excess leads on backside' },
  { name: 'PRESS FIT', description: 'Use pressure to insert a part on the PCB' },
  { name: 'HAND ASSEMBLY', description: 'Assembly of parts after wave but before inspection' },
  { name: 'AOI PROGRAMMING', description: 'Programming the AOI machine (first time build or new part/PCB change revision)' },
  { name: 'AOI', description: 'Automated Optical Inspection of the PCB' },
  { name: 'SECONDARY ASSEMBLY', description: 'Anything assembled after ESS testing or inspection' },
  { name: 'EPOXY', description: 'Anything that needs to be glued or epoxied' },
  { name: 'INTERNAL TESTING', description: 'In house test at ACI' },
  { name: 'LABELING', description: 'Place a label on the board per BOM instructions' },
  { name: 'DEPANEL', description: 'Break panel into individual boards' },
  { name: 'PRODUCT PICTURES', description: 'Take pictures of product before shipping to ESS, Parylene, or customer' },
  { name: 'SEND TO EXTERNAL COATING', description: 'Operator to sign and ship to coating' },
  { name: 'RETURN FROM EXTERNAL COATING', description: 'Operator to sign when received from coating' },
  { name: 'INTERNAL COATING', description: 'In house coating at ACI' },
  { name: 'SEND TO ESS', description: 'Operator to sign and ship to ESS' },
  { name: 'RETURN FROM ESS', description: 'Operator to sign when received from ESS' },
  { name: 'VISUAL INSPECTION', description: 'Human visual inspection parts and coating, no AOI' },
  { name: 'MANUAL ASSEMBLY', description: 'Put the assembly together by hand' },
  { name: 'BOX ASSEMBLY', description: 'Mechanical build consisting of the PCBA, hardware, and/or housings' },
  { name: 'HARDWARE', description: 'Adding screws, nuts, bolts, brackets, displays, etc. that need to be installed or individually packaged for shipment to customer' },
  { name: 'SHIPPING', description: 'Send product to customer per packing request' }
];

// PCB work centers
export const PCB_WORK_CENTERS: WorkCenterItem[] = [
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
  { name: 'GENERATE GERBER/PANELIZATION', description: 'Create a zip file for the PCB vendor that specifies the copper traces, solder mask, silkscreen, etc. along with a drill file and panelization' },
  { name: 'ORDER/PURCHASE PCB', description: 'Name of the PCB vendor and quantity needed' },
  { name: 'RECEIVING', description: 'Receive parts from vendors and put into ACI inventory' },
  { name: 'VSCORE', description: 'Use a machine to break a panel into individual boards' },
  { name: 'FINAL INSPECTION', description: 'Sample inspection of the PCB artwork by Quality Control' },
  { name: 'SHIPPING', description: 'Send product to customer per packing request' }
];

// Cables work centers
export const CABLES_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'WIRE CUT', description: 'Cut wire to length needed' },
  { name: 'STRIP WIRE', description: 'Remove insulation to necessary length' },
  { name: 'HEAT SHRINK', description: 'Cut and shrink (heat shrink or flex loom)' },
  { name: 'TINNING', description: 'Dip wire end into solder' },
  { name: 'CRIMPING', description: 'Fold into ridges by pinching together' },
  { name: 'INSERT', description: 'Install pins into connector' },
  { name: 'PULL TEST', description: 'Make sure crimps don\'t fall off' }
];

// Purchasing work centers
export const PURCHASING_WORK_CENTERS: WorkCenterItem[] = [
  { name: 'PURCHASING', description: 'Procure parts in sufficient quantities for build at the lowest price' },
  { name: 'QUOTE', description: 'Estimation of material, labor, and PCB costs to build an assembly' },
  { name: 'INVENTORY', description: 'Add to inventory and track stock levels' }
];

// Function to get work centers by traveler type
export const getWorkCentersByType = (type: string): WorkCenterItem[] => {
  switch (type) {
    case 'PCB_ASSEMBLY':
      return PCB_ASSEMBLY_WORK_CENTERS;
    case 'PCB':
      return PCB_WORK_CENTERS;
    case 'CABLES':
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
