import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor() { }

    /**
     * Export data to CSV file
     * @param data Array of objects to export
     * @param filename Name of the file without extension
     */
    exportToCSV(data: any[], filename: string): void {
        if (!data || !data.length) {
            console.warn('No data to export');
            return;
        }

        const separator = ',';
        const keys = Object.keys(data[0]);

        const csvContent = [
            keys.join(separator),
            ...data.map(row => keys.map(key => {
                let cell = row[key] === null || row[key] === undefined ? '' : row[key];
                // Handle strings with commas or quotes
                if (typeof cell === 'string') {
                    cell = cell.replace(/"/g, '""');
                    if (cell.search(/("|,|\n)/g) >= 0) {
                        cell = `"${cell}"`;
                    }
                }
                return cell;
            }).join(separator))
        ].join('\n');

        this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }

    /**
     * Export data to JSON file
     * @param data Array of objects to export
     * @param filename Name of the file without extension
     */
    exportToJSON(data: any[], filename: string): void {
        if (!data || !data.length) {
            console.warn('No data to export');
            return;
        }

        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
    }

    private downloadFile(content: string, filename: string, contentType: string): void {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
