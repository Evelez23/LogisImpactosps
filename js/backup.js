// === SISTEMA DE BACKUP MEJORADO ===
let lastBackupDate = localStorage.getItem('lastBackupDate');

function initializeBackupSystem() {
    updateBackupStatus();
    // Backup automático cada 24 horas
    setInterval(autoBackup, 24 * 60 * 60 * 1000);
}

function updateBackupStatus() {
    const statusElement = document.getElementById('backupStatus');
    const messageElement = document.getElementById('backupMessage');
    
    if (!lastBackupDate) {
        statusElement.className = 'status-indicator warning';
        messageElement.textContent = '⚠️ Nunca se ha hecho backup';
        return;
    }
    
    const lastBackup = new Date(lastBackupDate);
    const now = new Date();
    const hoursSinceBackup = (now - lastBackup) / (1000 * 60 * 60);
    
    if (hoursSinceBackup < 24) {
        statusElement.className = 'status-indicator';
        messageElement.textContent = `✅ Backup actualizado (${Math.round(hoursSinceBackup)}h ago)`;
    } else if (hoursSinceBackup < 72) {
        statusElement.className = 'status-indicator warning';
        messageElement.textContent = `⚠️ Backup hace ${Math.round(hoursSinceBackup)} horas`;
    } else {
        statusElement.className = 'status-indicator warning';
        messageElement.textContent = '🚨 BACKUP URGENTE - Más de 3 días';
    }
}

// Reemplaza las funciones de backup con estas:

function createBackup() {
    // Mostrar opciones de período
    const period = prompt(`¿Qué período quieres respaldar?
    
1 - Última semana
2 - Este mes  
3 - Mes anterior
4 - Todos los datos

Ingresa el número (1-4):`);

    let csvData, filename;
    
    switch(period) {
        case '1':
            const weekData = getLast7DaysData();
            csvData = generateWeeklyCSV(weekData);
            filename = `backup_semanal_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case '2':
            const currentMonthData = getCurrentMonthData();
            csvData = generateMonthlyCSV(currentMonthData, 'actual');
            filename = `backup_mes_actual_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case '3':
            const previousMonthData = getPreviousMonthData();
            csvData = generateMonthlyCSV(previousMonthData, 'anterior');
            filename = `backup_mes_anterior_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case '4':
            csvData = generateCompleteCSV();
            filename = `backup_completo_${new Date().toISOString().split('T')[0]}.csv`;
            break;
        default:
            showNotification('❌ Opción no válida', 'error');
            return;
    }
    
    downloadCSV(csvData, filename);
    
    // Actualizar estado
    lastBackupDate = new Date().toISOString();
    localStorage.setItem('lastBackupDate', lastBackupDate);
    updateBackupStatus();
    
    showNotification('✅ Backup en Excel creado correctamente');
}

function generateWeeklyCSV(weekData) {
    let csv = `IMPACTO SPS - BACKUP SEMANAL\n`;
    csv += `Generado: ${new Date().toLocaleDateString('es-ES')}\n`;
    csv += `Período: Últimos 7 días\n\n`;
    
    csv += `Fecha,Día,Servicio,Asistentes,Niños,Vehículos Impacto,Vehículos Little Feet,Vehículos Total,Ofrenda,Notas\n`;
    
    let totalAsistentes = 0;
    let totalVehiculos = 0;
    
    weekData.forEach(item => {
        totalAsistentes += item.asistentes || 0;
        totalVehiculos += item.total_vehiculos || 0;
        
        const fecha = formatDateForCSV(item.date);
        const dia = new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short' });
        
        csv += `"${fecha}","${dia}","${getServiceName(item.service)}",${item.asistentes || 0},${item.niños || 0},${item.vehiculos_impacto || 0},${item.vehiculos_lf || 0},${item.total_vehiculos || 0},${item.ofrenda || 0},"${item.notas || ''}"\n`;
    });
    
    csv += `\nRESUMEN SEMANAL\n`;
    csv += `Total asistentes:,${totalAsistentes}\n`;
    csv += `Total vehículos:,${totalVehiculos}\n`;
    csv += `Promedio diario:,${Math.round(totalAsistentes / 7)}\n`;
    csv += `Días con datos:,${weekData.length}\n`;
    
    return csv;
}

function generateMonthlyCSV(monthData, tipo) {
    const mesNombre = tipo === 'actual' ? 
        new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) :
        getPreviousMonthName();
    
    let csv = `IMPACTO SPS - BACKUP MENSUAL\n`;
    csv += `Generado: ${new Date().toLocaleDateString('es-ES')}\n`;
    csv += `Período: ${mesNombre}\n\n`;
    
    csv += `Fecha,Día,Servicio,Asistentes,Niños,Vehículos Impacto,Vehículos Little Feet,Vehículos Total,Ofrenda,Notas\n`;
    
    let totalAsistentes = 0;
    let totalVehiculos = 0;
    let serviciosCount = 0;
    
    // Agrupar por fecha para mejor organización
    const groupedByDate = {};
    monthData.forEach(item => {
        if (!groupedByDate[item.date]) {
            groupedByDate[item.date] = [];
        }
        groupedByDate[item.date].push(item);
    });
    
    // Ordenar por fecha
    Object.keys(groupedByDate).sort().forEach(date => {
        groupedByDate[date].forEach(item => {
            totalAsistentes += item.asistentes || 0;
            totalVehiculos += item.total_vehiculos || 0;
            serviciosCount++;
            
            const fecha = formatDateForCSV(item.date);
            const dia = new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short' });
            
            csv += `"${fecha}","${dia}","${getServiceName(item.service)}",${item.asistentes || 0},${item.niños || 0},${item.vehiculos_impacto || 0},${item.vehiculos_lf || 0},${item.total_vehiculos || 0},${item.ofrenda || 0},"${item.notas || ''}"\n`;
        });
    });
    
    csv += `\nRESUMEN MENSUAL\n`;
    csv += `Total asistentes:,${totalAsistentes}\n`;
    csv += `Total vehículos:,${totalVehiculos}\n`;
    csv += `Total servicios:,${serviciosCount}\n`;
    csv += `Promedio por servicio:,${Math.round(totalAsistentes / serviciosCount)}\n`;
    csv += `Días con datos:,${Object.keys(groupedByDate).length}\n`;
    
    return csv;
}

function generateCompleteCSV() {
    let csv = `IMPACTO SPS - BACKUP COMPLETO\n`;
    csv += `Generado: ${new Date().toLocaleDateString('es-ES')}\n`;
    csv += `Período: Todos los datos históricos\n\n`;
    
    csv += `Fecha,Día,Servicio,Asistentes,Niños,Vehículos Impacto,Vehículos Little Feet,Vehículos Total,Ofrenda,Notas\n`;
    
    let totalAsistentes = 0;
    let totalVehiculos = 0;
    
    // Agrupar por fecha para mejor organización
    const groupedByDate = {};
    attendanceData.forEach(item => {
        if (!groupedByDate[item.date]) {
            groupedByDate[item.date] = [];
        }
        groupedByDate[item.date].push(item);
    });
    
    // Ordenar por fecha
    Object.keys(groupedByDate).sort().forEach(date => {
        groupedByDate[date].forEach(item => {
            totalAsistentes += item.asistentes || 0;
            totalVehiculos += item.total_vehiculos || 0;
            
            const fecha = formatDateForCSV(item.date);
            const dia = new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short' });
            
            csv += `"${fecha}","${dia}","${getServiceName(item.service)}",${item.asistentes || 0},${item.niños || 0},${item.vehiculos_impacto || 0},${item.vehiculos_lf || 0},${item.total_vehiculos || 0},${item.ofrenda || 0},"${item.notas || ''}"\n`;
        });
    });
    
    csv += `\nRESUMEN GENERAL\n`;
    csv += `Total asistentes:,${totalAsistentes}\n`;
    csv += `Total vehículos:,${totalVehiculos}\n`;
    csv += `Total servicios:,${attendanceData.length}\n`;
    csv += `Promedio por servicio:,${Math.round(totalAsistentes / attendanceData.length)}\n`;
    csv += `Período cubierto:,${attendanceData[0]?.date || 'N/A'} a ${attendanceData[attendanceData.length - 1]?.date || 'N/A'}\n`;
    
    return csv;
}

// Funciones auxiliares
function getCurrentMonthData() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    return attendanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
    });
}

function getPreviousMonthData() {
    const currentDate = new Date();
    let previousMonth = currentDate.getMonth(); // Mes anterior (0-11)
    let year = currentDate.getFullYear();
    
    if (previousMonth === 0) {
        previousMonth = 12;
        year--;
    }
    
    return attendanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() + 1 === previousMonth && itemDate.getFullYear() === year;
    });
}

function getPreviousMonthName() {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatDateForCSV(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function emailBackup() {
    // Ofrecer las mismas opciones que en createBackup
    const period = prompt(`¿Qué período quieres enviar por email?
    
1 - Última semana
2 - Este mes  
3 - Mes anterior
4 - Todos los datos

Ingresa el número (1-4):`);

    let csvData, filename, subject;
    
    switch(period) {
        case '1':
            const weekData = getLast7DaysData();
            csvData = generateWeeklyCSV(weekData);
            filename = `backup_semanal_impacto.csv`;
            subject = `Backup Semanal Impacto SPS - ${new Date().toLocaleDateString('es-ES')}`;
            break;
        case '2':
            const currentMonthData = getCurrentMonthData();
            csvData = generateMonthlyCSV(currentMonthData, 'actual');
            filename = `backup_mes_actual_impacto.csv`;
            subject = `Backup Mes Actual Impacto SPS - ${new Date().toLocaleDateString('es-ES')}`;
            break;
        case '3':
            const previousMonthData = getPreviousMonthData();
            csvData = generateMonthlyCSV(previousMonthData, 'anterior');
            filename = `backup_mes_anterior_impacto.csv`;
            subject = `Backup Mes Anterior Impacto SPS - ${new Date().toLocaleDateString('es-ES')}`;
            break;
        case '4':
            csvData = generateCompleteCSV();
            filename = `backup_completo_impacto.csv`;
            subject = `Backup Completo Impacto SPS - ${new Date().toLocaleDateString('es-ES')}`;
            break;
        default:
            showNotification('❌ Opción no válida', 'error');
            return;
    }
    
    // Crear blob del CSV
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de email
    const body = `Adjunto el backup solicitado de las estadísticas de Impacto SPS.

Este archivo CSV puede abrirse con Excel o cualquier hoja de cálculo.

-- 
Sistema de Estadísticas Impacto SPS
Generado automáticamente`;
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    showNotification('📧 Abriendo cliente de email... Descarga el CSV manualmente para adjuntarlo.');
}

// Mantén las otras funciones (restoreBackup, autoBackup, etc.) iguales

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (backup.data && Array.isArray(backup.data)) {
                    // Verificar que los datos sean válidos
                    const isValid = backup.data.every(item => 
                        item.date && item.service && item.asistentes !== undefined
                    );
                    
                    if (isValid) {
                        if (confirm(`¿Restaurar backup con ${backup.data.length} registros?\n\nEsto reemplazará los datos actuales.`)) {
                            attendanceData = backup.data;
                            localStorage.setItem('churchAttendance', JSON.stringify(attendanceData));
                            
                            // Actualizar toda la aplicación
                            updateCharts();
                            updateQuickStats();
                            updateTrendAnalysis();
                            updateHistoricalTable();
                            updateSundayAnalysis();
                            updateTodayServices();
                            
                            showNotification('✅ Datos restaurados correctamente');
                        }
                    } else {
                        showNotification('❌ El archivo de backup no es válido', 'error');
                    }
                } else {
                    showNotification('❌ Formato de backup incorrecto', 'error');
                }
            } catch (error) {
                showNotification('❌ Error leyendo el archivo de backup', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function generateQuickSummary() {
    const totalRecords = attendanceData.length;
    const totalAsistentes = attendanceData.reduce((sum, item) => sum + (item.asistentes || 0), 0);
    const totalVehiculos = attendanceData.reduce((sum, item) => sum + (item.total_vehiculos || 0), 0);
    const promedio = Math.round(totalAsistentes / totalRecords);
    
    return `📊 RESUMEN DE DATOS:
• Total de registros: ${totalRecords}
• Total de asistentes: ${totalAsistentes}
• Total de vehículos: ${totalVehiculos}
• Promedio por servicio: ${promedio} personas
• Período: ${attendanceData[0]?.date || 'N/A'} - ${attendanceData[attendanceData.length - 1]?.date || 'N/A'}`;
}

function showNotification(message, type = 'success') {
    // Remover notificación existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}
