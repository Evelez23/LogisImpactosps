// === SISTEMA DE BACKUP AUTOMÁTICO ===
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

function createBackup() {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            data: attendanceData,
            totalRecords: attendanceData.length,
            version: '1.0',
            summary: {
                totalAsistentes: attendanceData.reduce((sum, item) => sum + (item.asistentes || 0), 0),
                totalVehiculos: attendanceData.reduce((sum, item) => sum + (item.total_vehiculos || 0), 0),
                totalServicios: attendanceData.length
            }
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_impactosps_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Actualizar estado
        lastBackupDate = new Date().toISOString();
        localStorage.setItem('lastBackupDate', lastBackupDate);
        updateBackupStatus();
        
        showNotification('✅ Backup creado y descargado correctamente');
    } catch (error) {
        showNotification('❌ Error creando backup: ' + error.message, 'error');
    }
}

function autoBackup() {
    if (attendanceData.length > 0) {
        lastBackupDate = new Date().toISOString();
        localStorage.setItem('lastBackupDate', lastBackupDate);
        console.log('🔄 Backup automático ejecutado');
    }
}

function emailBackup() {
    const subject = `Backup Impacto SPS - ${new Date().toLocaleDateString('es-ES')}`;
    const summary = generateQuickSummary();
    const body = `Adjunto encontrarás el backup de las estadísticas de Impacto SPS.

${summary}

-- 
Sistema de Estadísticas Impacto SPS
Generado automáticamente`;

    // Crear backup para adjuntar
    const backupData = {
        timestamp: new Date().toISOString(),
        data: attendanceData,
        totalRecords: attendanceData.length,
        summary: {
            totalAsistentes: attendanceData.reduce((sum, item) => sum + (item.asistentes || 0), 0),
            totalVehiculos: attendanceData.reduce((sum, item) => sum + (item.total_vehiculos || 0), 0)
        }
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
    });
    
    // Crear objeto URL para el archivo
    const url = URL.createObjectURL(blob);
    
    // Intentar abrir cliente de email
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    showNotification('📧 Abriendo cliente de email... Descarga el backup manualmente para adjuntarlo.');
}

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
