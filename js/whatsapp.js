// === SISTEMA WHATSAPP ===
function shareWeeklySummary() {
    const last7Days = getLast7DaysData();
    const message = generateWeeklyMessage(last7Days);
    shareOnWhatsApp(message);
}

function shareSundaySummary() {
    const lastSunday = findLastSundayWithData();
    if (!lastSunday) {
        showNotification('❌ No hay datos del último domingo', 'error');
        return;
    }
    
    const message = generateSundayMessage(lastSunday);
    shareOnWhatsApp(message);
}

function shareMonthlyReport() {
    const monthlyData = processMonthlyData();
    const message = generateMonthlyMessage(monthlyData);
    shareOnWhatsApp(message);
}

function shareVehiclesReport() {
    const vehiclesData = processVehiclesData();
    const message = generateVehiclesMessage(vehiclesData);
    shareOnWhatsApp(message);
}

function shareBackup() {
    const summary = generateQuickSummary();
    const message = `📊 RESUMEN IMPACTO SPS

${summary}

💾 Para backup completo, visita el sistema de estadísticas.`;
    shareOnWhatsApp(message);
}

// Generadores de mensajes
function generateSundayMessage(sundayData) {
    const services = sundayData.services;
    const service9am = services['9am'];
    const service11am = services['11am'];
    const service5pm = services['5pm'];
    
    const totalAsistentes = (service9am?.asistentes || 0) + 
                           (service11am?.asistentes || 0) + 
                           (service5pm?.asistentes || 0);
    
    const totalVehiculos = (service9am?.total_vehiculos || 0) + 
                          (service11am?.total_vehiculos || 0) + 
                          (service5pm?.total_vehiculos || 0);
    
    const totalLittleFeet = (service9am?.vehiculos_lf || 0) + 
                           (service11am?.vehiculos_lf || 0);

    return `📊 IMPACTO SPS - RESUMEN DOMINGO
${formatDate(sundayData.date).toUpperCase()}

⛪️ ASISTENCIA:
• 9:00 AM: ${service9am?.asistentes || 'N/D'} personas
• 11:00 AM: ${service11am?.asistentes || 'N/D'} personas  
• 5:00 PM: ${service5pm?.asistentes || 'N/D'} personas
🎯 TOTAL: ${totalAsistentes} asistentes

🚗 VEHÍCULOS:
• Impacto: ${totalVehiculos - totalLittleFeet} vehículos
• Little Feet: ${totalLittleFeet} vehículos
🎯 TOTAL: ${totalVehiculos} vehículos

📈 ¡A seguir creciendo en la obra de Dios! 🙏`;
}

function generateWeeklyMessage(weekData) {
    const totalWeek = weekData.reduce((sum, item) => sum + (item.asistentes || 0), 0);
    const totalVehicles = weekData.reduce((sum, item) => sum + (item.total_vehiculos || 0), 0);
    const avgDaily = Math.round(totalWeek / 7);
    
    // Encontrar el día con mayor asistencia
    const maxDay = weekData.reduce((max, item) => 
        item.asistentes > max.asistentes ? item : max, {asistentes: 0});
    
    return `📊 IMPACTO SPS - RESUMEN SEMANAL

📅 PERIODO: Últimos 7 días
👥 TOTAL SEMANAL: ${totalWeek} asistentes
🚗 VEHÍCULOS: ${totalVehicles} vehículos
📈 PROMEDIO DIARIO: ${avgDaily} personas
🏆 DÍA MÁS ALTO: ${maxDay.asistentes || 0} asistentes

🎯 ¡Dios sigue agregando a su iglesia! ✨`;
}

function generateMonthlyMessage(monthlyData) {
    const currentMonth = monthlyData.labels[monthlyData.labels.length - 1];
    const currentAvg = monthlyData.averages[monthlyData.averages.length - 1] || 0;
    const previousAvg = monthlyData.averages[monthlyData.averages.length - 2] || 0;
    const growth = previousAvg ? ((currentAvg - previousAvg) / previousAvg * 100).toFixed(1) : 0;
    
    const currentVehicles = monthlyData.avgVehicles[monthlyData.avgVehicles.length - 1] || 0;
    const previousVehicles = monthlyData.avgVehicles[monthlyData.avgVehicles.length - 2] || 0;
    const vehiclesGrowth = previousVehicles ? ((currentVehicles - previousVehicles) / previousVehicles * 100).toFixed(1) : 0;
    
    return `📊 IMPACTO SPS - REPORTE MENSUAL

📅 MES: ${currentMonth}
📈 ASISTENCIA: ${currentAvg} promedio por servicio
📊 CRECIMIENTO: ${growth}% vs mes anterior
🚗 VEHÍCULOS: ${currentVehicles} promedio
📈 CRECIMIENTO VEHÍCULOS: ${vehiclesGrowth}%

🎉 ¡Seguimos avanzando en el propósito de Dios! 🙌`;
}

function generateVehiclesMessage(vehiclesData) {
    return `🚗 IMPACTO SPS - ESTADÍSTICAS VEHÍCULOS

📊 TOTAL REGISTRADO: ${vehiclesData.total} vehículos
🚐 LITTLE FEET: ${vehiclesData.littleFeet} vehículos
📈 PROMEDIO POR SERVICIO: ${vehiclesData.average} vehículos
🏆 RÉCORD: ${vehiclesData.record} vehículos

🙏 ¡Gracias por el apoyo en transporte!
💛 Cada vehículo representa familias alcanzadas.`;
}

// Funciones auxiliares para WhatsApp
function getLast7DaysData() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    return attendanceData.filter(item => item.date >= sevenDaysAgoStr);
}

function processVehiclesData() {
    const total = attendanceData.reduce((sum, item) => sum + (item.total_vehiculos || 0), 0);
    const littleFeet = attendanceData.reduce((sum, item) => sum + (item.vehiculos_lf || 0), 0);
    const average = Math.round(total / attendanceData.length);
    const record = Math.max(...attendanceData.map(item => item.total_vehiculos || 0));
    
    return { total, littleFeet, average, record };
}

function shareOnWhatsApp(message) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Abrir en nueva pestaña
    window.open(whatsappUrl, '_blank');
    
    showNotification('📱 Abriendo WhatsApp...');
}
