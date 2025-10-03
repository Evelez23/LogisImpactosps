// === FUNCIONES DIRECTAS PARA REPORTES ESPECÍFICOS ===
function downloadWeeklyReport() {
    const weekData = getLast7DaysData();
    const csvData = generateWeeklyCSV(weekData);
    const filename = `reporte_semanal_impacto_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csvData, filename);
    showNotification('✅ Reporte semanal descargado en Excel');
}

function downloadMonthlyReport() {
    const monthData = getCurrentMonthData();
    const csvData = generateMonthlyCSV(monthData, 'actual');
    const filename = `reporte_mensual_impacto_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csvData, filename);
    showNotification('✅ Reporte mensual descargado en Excel');
}

// Función auxiliar para descargar CSV
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
