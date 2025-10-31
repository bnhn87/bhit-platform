import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { Project } from '../types';

/**
 * Triggers a download of the provided data as a file.
 * @param data The string data to download.
 * @param filename The name of the file.
 * @param mimeType The MIME type of the file.
 */
const downloadFile = (data: string, filename: string, mimeType: string) => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports the current canvas view as a PNG image.
 * @param projectName The name of the project, used for the filename.
 */
export const exportAsPng = async (projectName: string) => {
  const canvasElement = document.getElementById('floorplan-background');
  if (!canvasElement) {
    console.error("Floor plan element not found for export.");
    return;
  }
  const canvas = await html2canvas(canvasElement, {
      allowTaint: true,
      useCORS: true,
      backgroundColor: '#1a202c'
  });
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${projectName.replace(/ /g, '_')}_layout.png`;
  a.click();
};


/**
 * Exports the project as a multi-page PDF document.
 * Includes the layout image and a detailed inventory list.
 * @param project The project data to export.
 */
export const exportAsPdf = async (project: Project) => {
  const canvasElement = document.getElementById('floorplan-background');
  if (!canvasElement) {
    console.error("Floor plan element not found for export.");
    return;
  }
  const canvas = await html2canvas(canvasElement, {
      allowTaint: true,
      useCORS: true,
      backgroundColor: '#1a202c'
  });
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });

  // Page 1: The Layout Image
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  
  // Page 2: The Inventory List
  const placedFurniture = project.furniture.filter(f => f.x !== undefined);
  if (placedFurniture.length > 0) {
    pdf.addPage();
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(24);
    pdf.text(`Inventory List: ${project.name}`, 40, 60);

    const inventoryMap = new Map<string, { count: number, productCode?: string }>();
    placedFurniture.forEach(item => {
        if (!inventoryMap.has(item.name)) {
            inventoryMap.set(item.name, { count: 0, productCode: item.productCode });
        }
        inventoryMap.get(item.name)!.count++;
    });

    const inventoryList = Array.from(inventoryMap.entries());
    
    pdf.setFontSize(12);
    let y = 100;
    inventoryList.forEach(([name, data], _index) => {
      if (y > pdf.internal.pageSize.height - 40) {
        pdf.addPage();
        y = 60;
      }
      pdf.text(`${data.count}x - ${name} ${data.productCode ? `(${data.productCode})` : ''}`, 40, y);
      y += 20;
    });
  }

  pdf.save(`${project.name.replace(/ /g, '_')}_project.pdf`);
};

/**
 * Exports the project data as a JSON file.
 * @param project The project data to export.
 */
export const exportAsJson = (project: Project) => {
  // We only want to export the placed furniture data for this export type
  const exportData = {
    projectName: project.name,
    scale: project.scale,
    placedFurniture: project.furniture.filter(f => f.x !== undefined),
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  downloadFile(jsonString, `${project.name.replace(/ /g, '_')}_data.json`, 'application/json');
};